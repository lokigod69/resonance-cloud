# iPhone Mic Permission Fix Report

Date: 2026-05-08

## Root cause summary

On iPhone Safari, Voxtral and Gemini used the `useVoiceTutor.ts` recording path while `navigator.audioSession.type` could still be `playback`. In that state, iOS Safari rejects `navigator.mediaDevices.getUserMedia()` with `NotAllowedError` before showing the native microphone permission prompt.

Grok did not hit the regression because `useGrokRealtime.ts` already switches the iOS audio session to `play-and-record` immediately before its own `getUserMedia()` call.

## Files changed

- `frontend/src/hooks/useVoiceTutor.ts`
- `docs/FrontendInvestigations/IPHONE_MIC_PERMISSION_FIX_REPORT.md`

No changes were made to `frontend/src/hooks/useGrokRealtime.ts` or `frontend/src/lib/grokIOSAudioDiagnostics.ts`.

## Exact code path fixed

The fixed microphone path is:

`Speak.tsx` Voxtral/Gemini mic tap -> `useVoiceTutor.startRecording()` -> `ensureAudioContext()` -> `ensureStream()` -> `navigator.mediaDevices.getUserMedia({ audio: true })`

`ensureStream()` now calls:

```ts
setIOSAudioSessionType('play-and-record', 'voice-tutor-before-getUserMedia')
```

directly before:

```ts
navigator.mediaDevices.getUserMedia({ audio: true })
```

The assistant playback path now calls:

```ts
setIOSAudioSessionType('playback', 'voice-tutor-before-playback')
```

at the start of `playAudio()`, before assistant audio output.

## Intentionally not changed

- No Speak refactor.
- No provider routing changes.
- No prompt changes.
- No generation, cards, queues, GPT Image-2, or backend API changes.
- No removal of the Web Audio primer.
- No removal of the silent MP3 primer.
- No removal of the persistent `MediaStream` pattern.
- No MediaRecorder setup rewrite.
- No Grok session lifecycle changes.

## Why Grok was left untouched

Grok is the working reference path. Its hook already sets `audioSession.type = 'play-and-record'` immediately before `getUserMedia()` and restores playback mode after mic release. Changing Grok in this patch would increase regression risk without addressing the Voxtral/Gemini bug.

The existing helper remains in `frontend/src/lib/grokIOSAudioDiagnostics.ts` to avoid a behavior-changing move or abstraction during the surgical fix.

## Expected iPhone behavior after fix

- Existing iPhone Safari tabs should prompt or record successfully when Voxtral starts recording.
- Existing iPhone Safari tabs should prompt or record successfully when Gemini starts recording.
- Fresh private tab behavior should remain good.
- Grok behavior should remain unchanged.
- Assistant replies should reset the audio session to `playback` before output so audio routes through the speaker rather than staying in `play-and-record` mode.

## Diagnostics

The Voxtral/Gemini recording failure path now logs only safe technical fields:

- provider
- error name
- error message
- current `audioSession.type`, when available

It does not log tokens, audio, transcripts, user messages, or provider secrets.

## Remaining follow-up items

- Manually verify on iPhone Safari with existing regular tabs for Voxtral and Gemini.
- Confirm speaker routing during assistant playback on iPhone after a recorded turn.
- Consider a later no-behavior-change extraction or re-export from `grokIOSAudioDiagnostics.ts` to a generic iOS audio-session module.
- If iOS reports new failures, capture Safari Web Inspector logs for the safe recording diagnostics and `audioSession.type` transitions.
