# Guided Today — Segment Review V2 (Story-Based Recall)

Date: 2026-05-15
Author: Claude (implementation pass per Sir Robert's brief)
Scope: frontend Segment Review only. No backend, decks, words, generation, providers, credits, trophy songs, category practice, or language changes.

## Why V2

V1.7 segment review was structurally working but read as isolated cloze recall: "complete the English phrase." The audit at [GUIDED_TODAY_STATE_AUDIT_AND_SEQUENCE_DECISION_2026_05_15.md](GUIDED_TODAY_STATE_AUDIT_AND_SEQUENCE_DECISION_2026_05_15.md) (question 10) flagged that the loop carried the lesson's own phrase frame and a German cue but no scene-level thread between items.

V2 wraps the five segment lessons in a tiny practical story so the loop feels like one mini-situation, not five disconnected clozes.

## What changed

### Story scaffolding ([frontend/src/lib/guidedSegmentStories.ts](../../frontend/src/lib/guidedSegmentStories.ts))

New module. Static map keyed by `pathId:segment` holding:
- `title` — German story title shown after `Wiederholung 1` (e.g., `Wiederholung 1 — Ein erster Morgen auf Englisch`).
- `intro` — single short German sentence framing the five-step situation.
- `beats[]` — one short German scene-setter per lesson in the segment, ordered by `lessonNumber`.

Authored for all six visible (path, segment) pairs:

| Path | Segment | Story title | Lessons |
|---|---|---|---|
| A1 P1 | 1 | Ein erster Morgen auf Englisch | First contact → Polite follow-up → Where is...? → I'd like... → How much? |
| A1 P1 | 2 | Vom Zug bis zum Abschied | The train → I need... → I like... → Tomorrow at seven → Thank you, goodbye |
| A1 P2 | 1 | Du brauchst kleine Hilfe | I don't understand → Write it down → Show me → Which one? → Do you have...? |
| A1 P2 | 2 | Du wirst konkret | By card → A receipt, please → I have a reservation → Is this right? → One moment |
| A1 P3 | 1 | Unterwegs in der Stadt | Right or left? → How far is it? → Is it open? → Which bus? → The next stop |
| A1 P3 | 2 | Fast da | A ticket → Closing time → The corner → On foot or taxi? → I missed my stop |

P4/P5 — and any future path without a story — gracefully fall back: `getGuidedSegmentStory` returns `undefined`, the header drops the title-and-intro decoration, and the per-item card omits the scene line. Lesson content is untouched in any case.

### Plan ordering ([frontend/src/lib/guidedCheckpoint.ts](../../frontend/src/lib/guidedCheckpoint.ts))

`buildGuidedSegmentReviewPlan` no longer shuffles segment items. It explicitly sorts by `lessonNumber` and takes the first five. This is the precondition for "feels like one coherent story" — items 1, 2, 3, 4, 5 in order match the story beats in order.

Quick Review and Path Check still shuffle (their semantics are diagnostic, not narrative).

### Review UI ([frontend/src/pages/GuidedCheckpoint.tsx](../../frontend/src/pages/GuidedCheckpoint.tsx))

When `mode=segment-review`:
- **Header** renders `Wiederholung {n} — {story title}` and a compact German `intro` line under it.
- **Per-item card** renders the German `scene` line above the phrase shell. The scene line uses italic text in `--text-primary` so it reads as story, not chrome.
- **Phrase shell** uses the existing `TypeRecall` before / input / after layout (no data shape change).
- **Input placeholder** switches from `Englisch eingeben` to the new `today.checkpoint.segmentInputPlaceholder` → `Fehlenden Teil einsetzen`. Plain typing surfaces (path-check, quick review) keep the old placeholder.
- **Prompt copy** shortens from `Vervollständige die englische Phrase.` to `Setze den fehlenden Teil ein.`
- **Correct feedback** is now a single inline `CheckCircle2` icon + `Weiter` button. The standalone `Beim ersten Versuch richtig` pill is gone — keeps the card compact, matches "Correct feedback should not expand the card heavily."
- **Wrong feedback** keeps the compact `Antwort: {answer}` pill, plus `Weiter`.
- **Continue button** says `Weiter` after recall (already the case via `today.checkpoint.next`).
- **Speak step copy** is `Sprich die Phrase laut.` in `de`. EN/FR keep their existing English text.
- **Summary** title appends the story title (`Wiederholung abgeschlossen — Ein erster Morgen auf Englisch`) when a story exists. Missed-item review surface is unchanged.

### CSS ([frontend/src/components/today/Today.css](../../frontend/src/components/today/Today.css))

Three new classes:
- `.today-checkpoint-storyIntro` — width cap for the intro paragraph.
- `.today-checkpoint-storyScene` — italic style + slightly softened primary text for the per-item scene line.
- `.today-checkpoint-resultRow` — min-height to prevent layout jump between correct / wrong feedback.

### i18n ([frontend/src/lib/translations.ts](../../frontend/src/lib/translations.ts))

- Added `today.checkpoint.segmentInputPlaceholder` (de: `Fehlenden Teil einsetzen`, en/fr: `Fill in the missing part`).
- Updated `today.checkpoint.segmentTypePrompt` (de: `Setze den fehlenden Teil ein.`, en/fr: `Fill in the missing part.`).
- Aligned `today.checkpoint.segmentCompleteTitle` / `practiceAgainTitle` / `allCorrectBody` / `speakPrompt` across locales (en/fr had stray English-only values where de already had German equivalents).

`npm run check:i18n`: de 1085/1085 covered, fr deltas are pre-existing warn-only.

### Tests ([frontend/scripts/test-guided-segment-reviews.ts](../../frontend/scripts/test-guided-segment-reviews.ts))

New assertions:
- Segment 1 plan is in story order `[1, 2, 3, 4, 5]`; segment 2 plan is `[6, 7, 8, 9, 10]`. Order is now part of the contract, not an accident of shuffle.
- Every visible `(pathId, segment)` pair has a story: title, intro, and five beats whose `lessonNumber`s match the segment range in order.
- Every lesson in the segment has a scene line.
- Unknown paths return `undefined` (the graceful-fallback contract for P4/P5).
- The checkpoint route imports the story helpers, renders the intro with `data-segment-story-intro`, renders the per-item scene with `data-segment-story-scene`, uses `today.checkpoint.segmentInputPlaceholder`, and no longer ships the heavy `correctFirstTry` banner in `CheckpointTypeStep`.

Total: 236 assertions, 0 failures.

## Checks run

| Command | Result |
|---|---|
| `npx tsx scripts/test-guided-segment-reviews.ts` | **236 passed, 0 failed** |
| `npx tsx scripts/test-guided-today-data.ts` | 4510 passed, 0 failed |
| `npx tsx scripts/test-guided-today-path-overview.ts` | 141 passed, 0 failed |
| `npx tsx scripts/test-guided-cross-vibe.ts` | 150 pairs, 0 hard fails, 3 warns (sub-threshold), 2 allowlisted, 0 trophy collisions |
| `npm run test:guided-today` | end-of-chain OK |
| `npm run check:i18n` | exit 0; de 1085/1085 |
| `npm run build` | ✓ built in 1.24s |
| `npx eslint` on changed `.ts`/`.tsx` files | 0 errors |
| `git diff --check` | exit 0 |

## Lesson data shape

Preserved. No fields added, removed, or renamed in `guidedLessons.ts`. V2 builds a parallel "story" layer that consults each lesson's existing `typeRecall.before / answer / after` and `corePhrase.baseText`. Lesson content was not rewritten.

## Remaining limitations

1. **Speech scoring still unchanged.** The Speak step records via browser SpeechRecognition and treats any result (or none) as "done." No accuracy claim is made or shown. Out of scope per brief.
2. **Trophy / category / language flows untouched.** As required.
3. **Story copy is hand-authored, not generated.** Twelve German story beats live in code, not data. If new paths get authored, they need a matching block in `guidedSegmentStories.ts`. The fallback is silent (no story chrome) — not a broken state.
4. **P4 / P5 segment reviews work but have no story.** They render the existing scene-free review loop. Adding stories for them is a one-block addition when they ship in the directory.
5. **Story is German only.** EN/FR locales still default to the new English copy for the prompt/placeholder, but the story title, intro, and per-lesson scene line are all `de` text in the data module (the product is German-base by design). If we ever localize, this becomes another translation surface.
6. **No per-item speech scoring or pass/fail gating.** Continue is always available; speech feedback is still presentational.
