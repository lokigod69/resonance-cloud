# Guided Today UX Teardown V1.2 Report

Date: 2026-05-11

## Summary

Guided Today V1.2 makes `/today` feel less like an internal curriculum dashboard and more like a learner-facing path. The pass reduces labels, removes the visible time estimate, makes lesson cards fully clickable, shuffles build chips, and changes exercise feedback toward compact visual states.

## Files Changed

- `frontend/src/components/today/TodayHero.tsx`
- `frontend/src/components/today/TodayPathOverview.tsx`
- `frontend/src/components/today/TodaySession.tsx`
- `frontend/src/components/today/MatchPairsStep.tsx`
- `frontend/src/components/today/BuildPhraseStep.tsx`
- `frontend/src/components/today/TypeRecallStep.tsx`
- `frontend/src/data/guidedLessons.ts`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_UX_TEARDOWN_V1_2_REPORT.md`

## Copy Removed Or Simplified

- Removed the visible `Etwa 5 Min.` estimate from the compact Today lesson header.
- Replaced heavier path copy with learner-facing labels such as `Today`, `Next lesson`, `Your path`, `Done`, `Start`, `Replay`, and German equivalents.
- Removed the repeated selected-voice pill from the compact voice picker.
- Kept voice cards to name, one short line, and selected state.
- Kept the recommended panel to label, title, situation line, and one primary action.

## Lesson Card Click Behavior

Lesson cards are now full-card buttons instead of static cards with a small `Open` action. Clicking anywhere on a lesson node opens or replays that lesson.

The card button provides native keyboard behavior for Enter and Space, a visible focus ring, and an accessible label using the lesson number and title. Completed cards keep a check state, and the first incomplete lesson gets the subtle `Next` marker.

## Match And Build Feedback

Match Pairs now uses more compact chip-style rows in balanced columns. Correct matches lock with a green border/glow. Wrong attempts briefly mark both selected chips red and then reset without a large correction panel.

Build Phrase now uses `getDeterministicBuildChips(lesson)` so chips are stable but not presented in the authored target order. The selected answer area glows green for correct and red for wrong, with compact feedback only.

Type Recall no longer reveals the expected answer on the first wrong check. Wrong feedback is now compact `Try again.` / `Noch nicht.` copy, with the existing fallback help still available.

## Trophy Completion Treatment

The trophy word remains completion-only. The completion card now emphasizes the trophy word as the reward, with the word large, meaning small, and the why-it-matters line clamped to keep the reward compact.

Future phase note: trophy rewards are a good candidate for a generated or authored image asset later, but this pass deliberately did not add decorative or generated assets.

## Lesson 8

The Lesson 8 cleanup from V1.1 remains intact. This pass did not reintroduce `right call`, `good or odd`, or the incoherent Lesson 8 chips/items.

## Tests Run

- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npm run check:i18n`
- `npm run build`
- Targeted ESLint on changed Today files, data, translations, and script

Final whitespace and staged-diff checks are run before commit.

## Known Risks

- Authenticated visual QA for the actual `/today` path still depends on a valid local session.
- The compact match feedback uses a timed visual reset; if future automated interaction tests are added, they should account for the short wrong-state duration.
- `getDeterministicBuildChips` prevents the exact authored order, but it does not attempt pedagogical difficulty balancing.
- French Today key gaps remain warn-only and out of scope for the German-first Guided Today pass.

## Next Recommended Phase

Run authenticated visual QA and tune the path map density on mobile. After that, consider a dedicated reward treatment for trophy words, including generated or authored image assets, without bringing spoilers back into the path overview.
