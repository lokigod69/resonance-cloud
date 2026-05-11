# Guided Today Resonance MVP Report

Date: 2026-05-11

## Summary

Implemented an isolated authenticated `/today` route for the Guided Today MVP. The route presents one static guided lesson for the `English A1 Practical` path, focused on the phrase `Excuse me, do you speak English?` with German meaning and active production steps.

The page is shared by Classic and Glassy skins and uses the existing theme tokens, panel/chip surfaces, and authenticated layouts. It does not call generation, does not write to Supabase, does not populate decks or words, and does not touch credits.

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
- `frontend/src/components/today/PhraseMapStep.tsx`
- `frontend/src/components/today/BuildPhraseStep.tsx`
- `frontend/src/components/today/TypeRecallStep.tsx`
- `frontend/src/components/today/ReviewStep.tsx`
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

1. Scene: media slot, situation, core phrase, German meaning.
2. Phrase Map: phrase chunks with German equivalents.
3. Build Phrase: chip arrangement for `Excuse me, do you speak English?`.
4. Type Recall: `Excuse me, do you speak _____?`, accepting `English` and `english`.
5. Review: typed active recall for five lesson items.
6. Complete: local completion state, restart action, and next lesson teaser.

Wrong answers show calm inline feedback and allow retry without penalty. The lesson-level skip action stores a local skipped state.

## Intentionally Static

- One static lesson is defined in `frontend/src/data/guidedLessons.ts`.
- Lesson media uses an intentional styled placeholder because `lessonMedia.url` is empty.
- Completion and skipped state are stored in user-scoped localStorage only.
- No raw answers are stored; only completion status and coarse counts are stored.
- Next lesson is a teaser only.

## Placeholder Media Replacement

To replace the placeholder later, edit only `frontend/src/data/guidedLessons.ts`:

- For an image, set `lessonMedia.type` to `image` and provide `url`.
- For a video or music video, set `lessonMedia.type` to `video` or `music_video` and provide `url`.
- Optionally provide `posterUrl`.

When `url` is empty, the UI renders the styled placeholder and makes no media request.

## Not Touched

- Generation pipeline.
- `submit_generation`.
- `request_word_retry`.
- Credits and pricing behavior.
- Supabase migrations or schema.
- Dashboard behavior.
- Decks, Music, Study, and Speak internals.
- Deck or word population.
- Supabase writes.
- Paid provider calls.

## Checks Run

- `npx tsx scripts/test-guided-today-data.ts`
- `npm run check:i18n`
- `npm run build`
- Targeted ESLint on changed frontend files and validation script.
- Browser QA against local Vite:
  - unauthenticated `/today` redirects to `/login`
  - authenticated Classic `/today` renders
  - authenticated Glassy `/today` renders
  - Start lesson works
  - Build Phrase rejects incorrect order and accepts correct phrase
  - Type Recall rejects empty answer and accepts lowercase `english`
  - Review step completes active recall
  - Skip lesson stores local state
  - Completion persists after refresh
  - Restart starts a fresh session
  - no horizontal overflow at 390px, 640px, 768px, and 1280px in Classic and Glassy
  - Dashboard, Generate, Decks, and Speak still render under the authenticated shell

`npm run check:i18n` still reports the existing warn-only French Speak gaps; no Today or German coverage gaps were added.

## Remaining Risks

- LocalStorage progress is device-local and not cross-device.
- The placeholder media proves layout only; real image/video assets still need content review.
- The static lesson data has no authoring workflow or backend inventory yet.
- Synthetic local browser auth was used for route QA to avoid real Supabase writes.

## Recommended Next Phase

Add a small guided lesson inventory model after the product spine is validated:

- move static lessons behind a typed loader boundary
- add authored media URLs
- add a real progress sync design
- expand lessons in the English A1 Practical path
- add a lightweight component test setup for session state transitions
