# Study Flashcard Word TTS Investigation And Plan

Date: 2026-05-20

## Investigation

The flashcard study route renders the active word in `frontend/src/pages/StudyFlashcard.tsx` and gets card data from `useStudyUI`, which delegates to `useStudySession`. `useStudySession` already selects `tts_audio_url` from the `words` table for every completed study word, plus the target language through the joined deck row.

Pronunciation playback already exists in `frontend/src/hooks/usePronunciation.ts`. It chooses generated `tts_audio_url` first, cancels any previous audio or browser speech, and falls back to browser `speechSynthesis` when saved audio is missing or cannot play. That covers newer generated words and older/category-backed words without adding a backend call or changing study data fetching.

The main interaction risk is the global study keyboard shortcut in `useStudyUI`: Space and Enter reveal or grade cards. Once the displayed word becomes a real button, focused button key presses must not bubble into those shortcuts.

## Plan

1. Reuse `usePronunciation` in flashcard study mode.
2. Render the visible word as an accessible button with the word heading preserved inside it.
3. On click or tap, call `playWord(current)` so generated TTS is preferred and browser TTS is the fallback.
4. Keep reveal, retry, remembered, and review-later controls unchanged.
5. Update global study shortcuts to ignore focused buttons.
6. Add a regression script that checks the flashcard wiring and shortcut guard.
7. Verify with the new regression, the existing pronunciation playback regression, touched-file lint, and build.
