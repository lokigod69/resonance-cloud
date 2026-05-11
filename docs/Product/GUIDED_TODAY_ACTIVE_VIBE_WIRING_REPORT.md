# Guided Today Active Vibe Wiring Report

Date: 2026-05-11

## Summary

Bright, Wistful, and Sharp lesson variants for English A1 Practical lessons 1-10 are now wired into static Guided Today lesson data. The path id remains `english-a1-practical`, every lesson is marked usable via lesson `status: "active"`, and each lesson resolves only the three launch-active vibes at runtime.

## Source Docs Consumed

- `docs/Product/GUIDED_TODAY_VIBE_SYSTEM_ARCHITECTURE.md`
- `docs/Product/GUIDED_TODAY_VIBE_V0_IMPLEMENTATION_REPORT.md`
- `docs/Product/GUIDED_TODAY_VIBE_CHARACTER_BIBLES.md`
- `docs/Product/GUIDED_TODAY_BRIGHT_LESSONS_1_10_DRAFT.md`
- `docs/Product/GUIDED_TODAY_WISTFUL_LESSONS_1_10_DRAFT.md`
- `docs/Product/GUIDED_TODAY_SHARP_LESSONS_1_10_DRAFT.md`

## Files Changed

- `frontend/src/data/guidedLessons.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `docs/Product/GUIDED_TODAY_ACTIVE_VIBE_WIRING_REPORT.md`

## Lessons Wired

1. First contact
2. Polite follow-up
3. Where is...?
4. I'd like...
5. How much?
6. The train
7. I need...
8. I like...
9. Tomorrow at seven
10. Thank you, goodbye

## Active Vibes Wired

Every lesson now includes runtime variants for:

- `bright`
- `wistful`
- `sharp`

Future vibes remain absent from lesson runtime variants:

- `tender`
- `bold`
- `cheeky`

They remain non-selectable because `ACTIVE_GUIDED_VIBE_IDS` still contains only Bright, Wistful, and Sharp, and invalid or future selected values still resolve to Bright.

## Content Normalization

- The authored `GuidedLessonVibeVariant` objects were copied mechanically from the Bright, Wistful, and Sharp draft docs.
- Variant `contentStatus` remains `draft` consistently because the source lesson docs still label the content as review draft. Rendering is not blocked by draft status.
- Lesson-level `status` is `active` for all 10 lessons so the wired content is usable now.
- Invariant lesson metadata was normalized around the existing TypeScript shape: path metadata, lesson metadata, title, situation, pedagogical goal, mode set, steps, estimated minutes, fallback vibe, and next lesson teaser.
- Placeholder media remains static. The authored placeholder captions are used, and no new video assets were added.
- Lesson 10 points its `nextLessonTeaser` at the recommended next product phase, Guided Today Path Overview V1.

## Validation Behavior

`frontend/scripts/test-guided-today-data.ts` now validates:

- exactly 10 `english-a1-practical` lessons
- unique lesson ids
- contiguous lesson numbers 1-10
- Bright, Wistful, and Sharp variants on every lesson
- no Tender, Bold, or Cheeky runtime variants required for V0
- required fields on every variant
- non-empty chunks
- build chips supporting the target phrase
- typed recall answers and accepted answers
- speak targets compatible with core phrases
- trophy word completeness
- active fallback vibes
- invalid and future vibe fallback to Bright
- lesson-level, vibe-agnostic progress
- no raw typed recall answers or speech transcripts stored in progress results

Small pure helpers were added in `guidedLessons.ts`:

- `getGuidedPathLessons(pathId)`
- `getFirstIncompleteGuidedLesson(pathId, progress)`
- `getNextGuidedLesson(pathId, currentLessonId)`
- existing `resolveGuidedLessonVariant(lesson, selectedVibeId)` was retained and validated

## Still Local-Only

Progress remains localStorage-only and lesson-level. The selected vibe remains path-scoped localStorage preference state. Changing vibe does not fork or reset completion.

Stored progress still contains aggregate result fields only, such as attempts, fallback usage, speech pass status, and transcript match score. It does not store raw typed answers, raw speech transcripts, or per-vibe completion records.

## Deliberately Not Touched

- Supabase migrations or schema
- `submit_generation`
- `request_word_retry`
- credits or pricing
- decks
- words
- `generation_jobs`
- generation pipeline
- paid providers
- ElevenLabs
- KIE
- Suno
- Music internals
- Study internals
- Speak internals
- Slicer files
- broad app skin/theme system
- broad `/today` redesign

## Checks Run

- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-vibes.ts`
- `npm run check:i18n`
- `npm run build`
- `npx eslint src/data/guidedLessons.ts scripts/test-guided-today-data.ts`
- `git diff --check`
- `git diff --cached --check`

`npm run build` completed with existing Vite warnings about large chunks and an ineffective dynamic import involving `src/lib/supabase.ts`; it exited successfully.

## Known Risks

- Source lesson docs still say review draft. The runtime wiring keeps `contentStatus: "draft"` to reflect that, while lesson `status: "active"` makes the content playable.
- Some Sharp and Wistful lines are intentionally stylized A1 fragments. The source docs already call out those editorial risks, and this pass preserves them.
- `/today` still behaves as the current lesson surface rather than a full path overview. Static data now supports all 10 lessons, but broader path navigation remains a follow-up.

## Recommended Next Phase

Guided Today Path Overview V1.

Build a compact path overview that reads the static lesson inventory, shows lessons 1-10, highlights the first incomplete lesson, lets the learner start or resume a lesson, and keeps progress lesson-level and vibe-agnostic.
