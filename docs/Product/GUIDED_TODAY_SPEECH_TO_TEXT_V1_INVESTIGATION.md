# Guided Today Speech-to-Text V1 Investigation

Date: 2026-05-15

## Current Speak Step Flow

Guided Today lives in `frontend/src/pages/Today.tsx` and renders the session through `frontend/src/components/today/TodaySession.tsx`.

The session step order is:

`Scene -> Match Pairs -> Build Phrase -> Type Recall -> Speak -> Complete`

The prior Speak step was `frontend/src/components/today/SpeakStep.tsx`. It used `frontend/src/components/today/speechRecognition.ts`, which wrapped browser-native `SpeechRecognition` / `webkitSpeechRecognition`. That meant the UI showed a recording-style button and local transcript checking, but it did not upload recorded audio to the app's STT provider.

Progress storage is local-only in `frontend/src/lib/todayProgress.ts`. It stores attempts, score, and pass/continue state only. It does not store raw speech transcripts.

## Existing Voice/STT Code

The full Speak tutor uses:

- `frontend/src/hooks/useVoiceTutor.ts`
- `frontend/api/voice-chat.ts`
- `frontend/src/lib/grokIOSAudioDiagnostics.ts`

Useful pieces found:

- `MediaRecorder` recording with runtime MIME selection.
- `navigator.mediaDevices.getUserMedia({ audio: true })` from a user action.
- Safari/iOS preference for `audio/mp4` because WebM recording can be unreliable there.
- `setIOSAudioSessionType('play-and-record', ...)` before `getUserMedia`.
- Supabase session bearer auth on API calls.
- Groq Whisper STT call in `voice-chat.ts`.

Intentionally not reused:

- tutor prompt building
- conversation history
- speak persistence tables
- Grok realtime
- TTS
- correction generation

## Phase 1C Protection

Phase 1C helpers exist:

- `frontend/api/_shared/auth.ts`
- `frontend/api/_shared/quota.ts`
- `frontend/api/_shared/http.ts`
- `frontend/api/_shared/cors.ts`

The new endpoint should gate requests before provider calls with:

1. Supabase bearer auth
2. JSON/body validation
3. API quota consumption
4. provider call

## Endpoint Decision

Decision: create `frontend/api/guided-transcribe.ts`.

Reason: `voice-chat.ts` already mixes STT, LLM response generation, tutor pedagogy, TTS, roleplay, corrections, and provider-specific branches. Guided Today V1 only needs short audio -> transcript. A separate endpoint avoids importing tutor responsibilities into Today while reusing the same auth/quota pattern and Groq STT provider.

## Mobile/iPhone Strategy

The frontend should:

- start microphone access only inside the Record button handler
- use `navigator.mediaDevices.getUserMedia({ audio: true })`
- call `setIOSAudioSessionType('play-and-record', 'guided-today-before-getUserMedia')`
- choose MIME type at runtime with `MediaRecorder.isTypeSupported(...)`
- prefer WebM on non-Safari browsers
- prefer MP4 on Safari/iOS because the existing tutor hook documents WebM recorder issues
- auto-stop short recordings after the lesson's `maxRecordingSeconds` or a default
- stop all media tracks after recording
- show readable permission and unsupported-browser errors

## Answer Checking Policy

The checker should not require greetings unless the lesson config says they are core.

V1 policy:

- normalize case, punctuation, spacing, apostrophes, simple contractions, and edge filler words
- accept exact target matches
- accept configured variants
- accept required core tokens in order
- classify one-missing-token/high-similarity attempts as `close`
- classify unrelated transcripts as `incorrect`

For the Bright lesson 1 example, the German prompt `Hallo, sprechen Sie Englisch?` is context. The required spoken target is `Do you speak English?`, with greetings as accepted/optional variants.

## No Persistence Confirmation

Guided Today Speech-to-Text V1 does not save:

- audio
- transcript
- speak conversations
- speak messages
- Supabase speak rows

Only the existing local progress summary remains: attempts, score, and pass/continue state.
