# Guided Today Speech-to-Text V1 Implementation Report

Date: 2026-05-15

## Files Changed

- `frontend/api/guided-transcribe.ts`
- `frontend/src/hooks/useGuidedSpeechRecognition.ts`
- `frontend/src/lib/guidedSpeechCheck.ts`
- `frontend/src/components/today/SpeakStep.tsx`
- `frontend/src/components/today/TodaySession.tsx`
- `frontend/src/components/today/Today.css`
- `frontend/src/data/guidedLessons.ts`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-guided-speech-check.ts`
- `frontend/scripts/test-paid-api-protection.ts`
- `docs/Product/GUIDED_TODAY_SPEECH_TO_TEXT_V1_INVESTIGATION.md`
- `docs/Product/GUIDED_TODAY_SPEECH_TO_TEXT_V1_IMPLEMENTATION_REPORT.md`

## Endpoint

Added `POST /api/guided-transcribe`.

Behavior:

- accepts `audio_base64`, `mime_type`, and optional `language`
- rejects missing audio
- rejects malformed or oversized audio
- rejects unsupported MIME types
- rejects conversation fields such as `history`, `transcript`, and `messages`
- requires Supabase auth
- consumes existing `voice_chat` API quota before provider calls
- calls Groq Whisper STT
- returns `{ "transcript": "..." }`
- returns safe generic provider errors

No LLM, TTS, correction, realtime, or persistence behavior was added.

## UI States

The Today Speak step now supports:

- idle
- requesting microphone permission
- recording with red pulsing feedback
- transcribing
- correct
- close
- failed
- error
- continued
- unsupported browser

After transcription, the UI shows:

`Du hast gesagt`

followed by the transcript in a visible box. Correct attempts show a green result pill and unlock Continue automatically. Close/failed/error states keep retry available and expose `Trotzdem fortfahren`.

## Answer Checking

Added `frontend/src/lib/guidedSpeechCheck.ts`.

The checker:

- normalizes case, punctuation, whitespace, apostrophes, contractions, and edge filler words
- accepts exact target answers
- accepts configured variants
- accepts required core tokens in order
- returns `correct`, `close`, or `incorrect`

Bright lesson 1 now uses `Do you speak English?` as the required spoken answer while accepting greeting variants like `Hi, do you speak English?` and `Hi there, do you speak English?`.

## Mobile/iPhone

Added `frontend/src/hooks/useGuidedSpeechRecognition.ts`.

The hook:

- starts mic capture only from the Record button path
- uses `getUserMedia({ audio: true })`
- calls `setIOSAudioSessionType('play-and-record', 'guided-today-before-getUserMedia')`
- selects MIME type with `MediaRecorder.isTypeSupported(...)`
- prefers `audio/webm` on non-Safari browsers
- prefers `audio/mp4` on Safari/iOS
- auto-stops after `maxRecordingSeconds`
- stops tracks after each recording
- reports user-readable mic and transcription errors

## Tests And Checks

Verification run:

- `npx tsx scripts/test-guided-speech-check.ts` passed
- `npx tsx scripts/test-paid-api-protection.ts` passed
- `npx tsx scripts/test-guided-today-data.ts` passed
- `npx tsx scripts/test-guided-today-path-overview.ts` passed
- `npx tsx scripts/test-guided-vibes.ts` passed
- targeted ESLint for changed frontend files passed
- `npm run check:i18n` passed with the existing warn-only French gaps
- `npm run typecheck:api` passed
- `npx tsc -p tsconfig.app.json --noEmit` passed
- `npm run build` passed
- `git diff --check` passed
- `git diff --cached --check` passed

## Manual QA

1. Start the frontend.
2. Open `/today`.
3. Start the selected Guided Today lesson.
4. Advance to the Speak step.
5. Tap `Aufnahme starten`.
6. Allow microphone access.
7. Speak the expected English phrase.
8. Tap `Aufnahme stoppen`, or wait for auto-stop.
9. Confirm the transcript box appears.
10. Confirm correct answers show green and unlock Continue.
11. Confirm failed/error states allow retry and `Trotzdem fortfahren`.

## Remaining Risks

- Real STT quality depends on microphone, browser recorder format, network, and Groq availability.
- The endpoint reuses the existing `voice_chat` quota action because no dedicated `guided_transcribe` quota action exists yet.
- Automated tests mock providers and do not call paid STT.
