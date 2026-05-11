# Guided Today Resonance MVP Report

Date: 2026-05-11

## Summary

Implemented and polished the isolated authenticated `/today` Guided Today prototype for one static lesson:

- Path: `English A1 Practical`
- Base language: German
- Target language: English
- Lesson 1: `First contact`
- Core phrase: `Excuse me, do you speak English?`
- German meaning: `Entschuldigung, sprechen Sie Englisch?`

V4 keeps the prototype static and local-only while finishing the Lesson 1 interaction polish: the pre-start preview is now a compact vocabulary list, the intro no longer duplicates the full lesson video moment, the Scene step owns video playback, Back from Step 1 returns to the intro, feedback stays compact, and completion copy now accounts for items marked as already known.

## Files Changed

- `frontend/src/App.tsx`
- `frontend/src/components/layout/AppHeader.tsx`
- `frontend/src/components/layout/PolishGlassLayout.tsx`
- `frontend/src/lib/translations.ts`
- `frontend/src/pages/Today.tsx`
- `frontend/src/data/guidedLessons.ts`
- `frontend/src/lib/todayProgress.ts`
- `frontend/src/components/today/TodayHero.tsx`
- `frontend/src/components/today/TodaySession.tsx`
- `frontend/src/components/today/MatchPairsStep.tsx`
- `frontend/src/components/today/BuildPhraseStep.tsx`
- `frontend/src/components/today/TypeRecallStep.tsx`
- `frontend/src/components/today/ReviewStep.tsx`
- `frontend/src/components/today/speech.ts`
- `frontend/public/guided/english-a1-practical/lesson-001-first-contact.mp4`
- `frontend/scripts/test-guided-today-data.ts`
- `docs/Product/GUIDED_TODAY_RESONANCE_MVP_REPORT.md`

## Route Added

- `/today` is mounted inside `ProtectedRoute` for both skin branches:
  - Classic: `AppLayout`
  - Glassy: `PolishGlassLayout`
- Unauthenticated `/today` redirects to `/login`.
- `Today` navigation is added after Dashboard and before Decks in:
  - `AppHeader.tsx`
  - `PolishGlassLayout.tsx`

## Session Behavior

The session sequence is:

1. Scene: prominent media slot, German situation, English core phrase, German meaning, and a browser `speechSynthesis` listen button for the English phrase. The button fails silently if speech synthesis is unavailable.
2. Match Pairs: the learner connects English chunks to German meanings. Continue stays disabled until all pairs are matched.
3. Build Phrase: chip arrangement for `Excuse me, do you speak English?`; the correct order is accepted automatically and the Continue action becomes available after success.
4. Type Recall: exactly one typed prompt, `Excuse me, do you speak _____?`, accepting `English` and `english` without spoiling the answer in the placeholder.
5. Review: chip-choice active recall from German prompts for only the lesson items not marked `Schon bekannt` before starting.
6. Complete: German completion copy, dynamic review count, local completion state, restart action, and next lesson teaser.

Before the session starts, the hero includes a compact `Heute lernst du` vocabulary list for all five lesson items:

- `excuse me` - `Entschuldigung`
- `do you speak` - `sprechen Sie`
- `English` - `Englisch`
- `please` - `bitte`
- `thank you` - `danke`

Marking an item with the small known toggle affects only the current page/session review list. It does not remove required chunks from Scene, Match Pairs, Build Phrase, or Type Recall, does not write schema state, and does not create per-word skips.

## V4 Finish Polish

- Replaced the heavier pre-start item cards with a compact vocabulary list: English, Deutsch, and a small known toggle.
- Known rows are visually dimmed/struck through and still only skip the final Review step.
- Changed intro media into a poster-style lesson preview so the learner does not play the full video before Step 1.
- Kept the playable lesson video in the Scene step as the primary lesson moment.
- Removed duplicate caption/situation copy from the media area.
- Back from Step 1 now returns to the intro without clearing known-item selections.
- Completion uses a clearer success-toned check and summarizes skipped known items:
  - `Wiederholung: 5/5` when nothing was marked known.
  - `Wiederholung: 1/1 · 4 als bekannt markiert` when some items were skipped.
  - `Kurze Wiederholung übersprungen · 5 als bekannt markiert` when all review items were skipped.
- Kept Match Pairs, Build Phrase, Type Recall, and Review feedback short with compact check/X states.
- Still no schema, generation, credits, provider calls, or backend writes.

## Intentionally Static

- One static lesson is defined in `frontend/src/data/guidedLessons.ts`.
- Lesson media uses the checked-in 2.4 MB public video asset at `/guided/english-a1-practical/lesson-001-first-contact.mp4`.
- Completion and skipped state are stored in user-scoped localStorage only.
- Known-item marks are session-local React state only.
- No raw answers are stored; only completion status and coarse counts are stored.
- Next lesson is a teaser only.

## Media Replacement

To replace the lesson video later, edit only `frontend/src/data/guidedLessons.ts`:

- For an image, set `lessonMedia.type` to `image` and provide `url`.
- For a video or music video, set `lessonMedia.type` to `video` or `music_video` and provide `url`.
- Optionally provide `posterUrl`.
- Keep `caption` as the learner-visible scene caption.

When `url` is empty, the UI renders the styled placeholder and makes no media request. When `lessonMedia.type` is `video` or `music_video` and `url` exists, the UI renders a `playsInline` controls video element.

## Not Touched

- Generation pipeline.
- `submit_generation`.
- `request_word_retry`.
- Credits and pricing behavior.
- Supabase migrations or schema.
- Dashboard behavior.
- Decks, words, and generation jobs.
- Music, Study, and Speak internals.
- Deck or word population.
- Supabase writes.
- Paid provider calls, ElevenLabs, or real TTS providers.
- Slicer files.

## Future Resonance Layers, Not Implemented

- Stock lesson TTS inventory: pre-generated English phrase/word audio via ElevenLabs or similar, stored once and reused for all learners.
- Cinematic lesson scene videos: one pre-generated video per lesson/language pair, hosted as system media.
- Phase reward song: later feature after 5-10 lessons, not after Lesson 1. Later flow: learner finishes a phase, chooses stock song or custom genre, custom generation costs credits, and the generated song uses phrases/weak words from that phase.
- Games: Slicer/Strike/memory games unlock after phase completion, not inside Lesson 1.
- Persistent progress/schema: later phase.
- Lesson 2+ can now reuse this template.
- A later inventory model should support lesson video URL, optional poster URL, stock audio URLs, phase reward song configuration, and lesson item metadata.

## Checks Run

- `npx tsx scripts/test-guided-today-data.ts`
- `npm run check:i18n`
- `npm run build`
- Targeted ESLint on changed Today files.
- `git diff --check`
- `git diff --cached --check`
- Local Vite browser QA:
  - unauthenticated `/today` redirects to `/login`
  - public lesson video URL loads through Vite at `/guided/english-a1-practical/lesson-001-first-contact.mp4`
  - authenticated in-app browser QA could not be completed in this run because the browser security policy blocks synthetic localStorage session seeding and no local test credentials are available in the repo

## Remaining Risks

- LocalStorage progress is device-local and not cross-device.
- The checked-in local video proves lesson-video playback, but final production hosting/storage policy still needs a product decision.
- The static lesson data has no authoring workflow or backend inventory yet.
- Browser `speechSynthesis` voice quality and availability vary by browser and OS.
- Authenticated visual QA should be rerun with a real test session; the code path is covered by TypeScript build, targeted lint, data validation, and route inspection for both Classic and Glassy branches.

## Recommended Next Phase

Add a small guided lesson inventory model after the product spine is validated:

- move static lessons behind a typed loader boundary
- add authored media URLs
- add stock lesson audio references
- add a real progress sync design
- expand lessons in the English A1 Practical path
- add a lightweight component test setup for session state transitions
