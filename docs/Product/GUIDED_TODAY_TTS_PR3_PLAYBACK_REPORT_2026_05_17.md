# Guided Today TTS PR #3 playback report

Date: 2026-05-17

## Scope

PR #3 wires `/today` learner playback to read ready rows from `public.guided_tts_playback` and play their Supabase Storage MP3 URL when available. Browser `speakGuidedText(...)` remains the fallback for every miss or playback failure.

## Files changed

- `frontend/src/lib/guidedAudio.ts` - new cached resolver and MP3-first playback helper.
- `frontend/src/components/today/speech.ts` - exports the existing SpeechSynthesis cancel behavior for stored-audio playback.
- `frontend/src/components/today/TodaySession.tsx` - Scene Listen and completion trophy word Listen now use the guided audio helper.
- `frontend/src/components/today/MatchPairsStep.tsx` - English chunk chips now have compact Listen buttons.
- `frontend/scripts/test-guided-audio-playback.ts` - focused resolver/playback safety tests.
- `docs/Product/GUIDED_TODAY_TTS_PR3_PLAYBACK_REPORT_2026_05_17.md` - this report.

## Surfaces wired

- Scene Listen: `surface = corePhrase`, `surface_key = __self`, `text = lesson.corePhrase.targetText`.
- Match Pairs English chunk Listen buttons: `surface = chunk`, `surface_key = phraseChunk.id`, `text = chunk.targetText`.
- Completion trophy word Listen: `surface = trophyWord`, `surface_key = __self`, `text = lesson.trophyWord.word`.

Not wired in this PR: speak-step pre-recognition playback, typeRecall, build chips, lessonItems, review/path-check/segment-review, `trophyWord.example`, videos, trophy songs, music/Suno, generation buttons, or all-A1 generation.

## Lookup key shape

The frontend resolver queries only `public.guided_tts_playback` with:

`path_id | lesson_id | vibe | surface | surface_key`

The in-memory page-session cache uses the same key shape:

`pathId|lessonId|vibe|surface|surfaceKey`

The resolver returns `{ kind: 'ready', url, durationMs }` when `public_url` exists, otherwise `{ kind: 'missing' }`. It does not read `guided_tts_assets` directly and does not expose voice IDs.

## Fallback behavior

- Ready row with `public_url`: create an `HTMLAudioElement` and call `play()`.
- Missing row: call existing `speakGuidedText(text, lang)`.
- Supabase/query/network failure: cache missing for that page session and call `speakGuidedText(text, lang)`.
- Audio construction failure, `play()` rejection, or audio `error` event: stop the stored audio and call `speakGuidedText(text, lang)`.
- Starting any new guided audio stops the currently active stored audio first; stored audio also cancels active browser speech before it starts.
- No logged-in user or RLS failure is treated as a resolver miss, so the lesson can continue through browser speech.

## Manual QA

- A1P1 MP3 playback manual verification: not verified in this environment. The local dev server loaded, but the in-app browser reached the sign-in screen and no authenticated `/today` session was available.
- Non-generated lesson fallback manual verification: not verified in browser for the same reason.
- Automated coverage verifies ready URL resolution, missing-row fallback, audio-error fallback, cache behavior, static frontend safety, and A1P1 surface-key shape.

## Safety confirmations

- No ElevenLabs calls are reachable from the frontend playback path.
- No generation/provider code is imported by `frontend/src/lib/guidedAudio.ts`.
- No assets are created.
- No generation rows are written.
- No service role is used.
- No API keys are exposed.
- No SQL/schema changes were made.
- No music, Suno, or trophy-song files were changed.

## Checks

Run after implementation:

- `npm run build` - passed from the canonical `orchestrator` tree on `main`.
- `npm run test:guided-today` - passed from the canonical `orchestrator` tree on `main`.
- `npx tsx scripts/test-guided-tts-inventory.ts` - passed from the canonical `orchestrator` tree on `main`; warning remains that 1500 rows have no voice profile before PR #2 commit-mode generation.
- `npx tsx scripts/test-guided-today-data.ts` - passed, 8981 passed / 0 failed.
- `npx tsx scripts/test-guided-today-path-overview.ts` - passed, 186 passed / 0 failed.
- `npx tsx scripts/test-guided-audio-playback.ts` - passed, 29 passed / 0 failed.
- `npx eslint src/lib/guidedAudio.ts src/components/today/TodaySession.tsx src/components/today/MatchPairsStep.tsx src/components/today/speech.ts scripts/test-guided-audio-playback.ts` - passed.
- `git diff --check` - passed.

## Next step recommendation

Use an authenticated browser session to verify `/today?path=english-a1-practical-1&vibe=bright`, `wistful`, and `sharp` against the live Supabase project, then expand generation beyond A1P1 lesson 1 only after MP3 playback is confirmed in the learner UI.
