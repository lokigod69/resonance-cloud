# iPhone Speak Scroll Investigation

Date: 2026-05-08

## Root cause

The Speak setup flows mixed two scroll models on iPhone Safari:

- language, provider, Grok voice/mode/level, Voxtral tutor, and Gemini vibe setup screens relied on document/body scrolling under the fixed glass navigation header
- active chat screens used fixed Speak shells with an inner `overflow-y-auto` transcript region

The setup screens also place most touch starts on full-card `button` elements. On iOS Safari, that combination can make fast vertical flicks over dense button grids intermittently bounce the page instead of transferring momentum into the expected scroll surface. Slow drags still work because WebKit eventually resolves the gesture as document scroll.

## Files changed

- `frontend/src/pages/Speak.tsx`
- `frontend/src/index.css`
- `docs/FrontendInvestigations/IPHONE_SPEAK_SCROLL_INVESTIGATION.md`

## Exact layout issue fixed

`SpeakSelectionShell` now marks setup screens with `speak-setup-scroll`. On mobile widths, that shell becomes the one explicit fixed scroll container below `var(--glassy-header-offset)`:

- `position: fixed`
- `inset: var(--glassy-header-offset) 0 0`
- `overflow-y: auto`
- `-webkit-overflow-scrolling: touch`
- `overscroll-behavior-y: contain`
- `touch-action: pan-y`

The existing active chat transcript regions now use `speak-scroll-region`, which adds the same iOS momentum and vertical-pan hints without changing the chat layout or mic controls.

Selectable setup buttons inside the setup scroll root use `touch-action: pan-y` so vertical flicks over cards/chips are treated as scrolling gestures. The start button keeps `touch-action: manipulation` because it is a direct tap control.

## Why mic/audio code was not touched

This issue is provider-independent and appears before or around setup sections like language selection, provider selection, Gemini vibes, and Grok setup. The iPhone mic permission hotfix in `useVoiceTutor.ts` concerns `navigator.audioSession.type` immediately before `getUserMedia()` and before playback. No evidence pointed to a microphone, provider API, prompt, or Grok realtime lifecycle problem.

`useVoiceTutor.ts` and `useGrokRealtime.ts` were not modified.

## Before and after expected iPhone behavior

Before:

- fast flicks over Speak setup cards could rubber-band instead of scrolling
- slow thumb drags were more reliable than normal flick scrolling
- scroll behavior improved only after the page was already moving
- provider setup, language, voice, vibe, and level sections could feel intermittently unreachable

After:

- Speak setup screens have one clear mobile scroll root
- fast flicks over language/provider/vibe/voice cards should scroll naturally
- rubber-band bounce should occur only when the setup scroll root is actually at the top or bottom
- active chat transcript scrolling keeps the existing layout but gains iOS momentum scrolling
- Voxtral, Gemini, and Grok mic behavior remains unchanged

## Remaining risks

- Real-device iPhone Safari testing is still required because WebKit scroll gesture arbitration cannot be fully reproduced by local desktop build checks.
- The classic skin uses a different layout header, but the mobile scroll root still uses the shared `--glassy-header-offset` variable. If testers report a classic-skin offset mismatch, the offset can be split by skin in CSS.
- `SpeakHistoryPanel` remains its own overlay scroll region; it was not part of the reported setup-scroll problem.
