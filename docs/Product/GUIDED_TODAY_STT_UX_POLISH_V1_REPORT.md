# Guided Today STT UX Polish V1 Report

## Verdict

Pass with UI-only polish. Guided Today STT remains production-ready, and this pass did not change the STT endpoint, quota action, providers, Supabase schema, quota enforcement, or persistence.

## Recording State

The separate recording status chip was removed from the Speak step. The recording state now lives on the stop button itself:

- The button remains red/destructive while recording.
- The button still says `Aufnahme stoppen`.
- A small pulsing dot is shown inline inside the stop button.
- The separate `Aufnahme läuft...` chip is no longer rendered, avoiding duplicate recording copy.

## Transcript And Result Display

The transcript card still shows:

- `Du hast gesagt`
- the recognized transcript text

Correctness feedback is now integrated into that transcript card:

- Correct results use a green border/glow/background accent on the card.
- The `Richtig.` label is shown as a small inline result badge in the card header.
- The old detached floating result pill was removed.
- Close and failed states keep the transcript card visible, with close using a subtle warning accent and failed/continued using a neutral treatment.
- Failed and close states still leave the record button available for retry and still show `Trotzdem fortfahren`.

## Expected Answer Display

Guided lesson speak data now supports an optional `displayAnswer` field. The Speak step chooses the expected/hint display text in this order:

1. `lesson.speak.displayAnswer`
2. `lesson.speak.targetAnswer`
3. `lesson.speak.targetPhrase`

Lesson 1 sets:

`displayAnswer: "Do you speak English?"`

That means failed/close feedback now displays:

`Erwartet: Do you speak English?`

The vibe-flavored lesson targets and accepted greeting variants remain valid for answer checking.

## Accepted Variants

The existing checker behavior remains intact. Lesson 1 still accepts:

- `Do you speak English?`
- `Hi, do you speak English?`
- `Hello, do you speak English?`
- `Hi there, do you speak English?`

The checker was not loosened for unrelated transcripts, missing core words, empty transcripts, or out-of-order required tokens.

## Boundaries

No changes were made to:

- `/api/guided-transcribe`
- `guided_transcribe` quota action
- quota enforcement
- Supabase schema or migrations
- Groq, TTS, LLM, realtime voice, or Speak tutor providers
- decks, words, generation jobs, credits, or persistence

## Checks Run

Passed:

- `npx tsx scripts/test-guided-speech-check.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-vibes.ts`
- `npm run check:i18n`
- `npm run build`
- `npx eslint src/components/today/SpeakStep.tsx src/data/guidedLessons.ts scripts/test-guided-today-data.ts`
- `git diff --check`
- `git diff --cached --check`

Notes:

- ESLint ignores CSS files in the current config, so `Today.css` was covered by build and `git diff --check`.
- No paid providers were called by the test suite.
