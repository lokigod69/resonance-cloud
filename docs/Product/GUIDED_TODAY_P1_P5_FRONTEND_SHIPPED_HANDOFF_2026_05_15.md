# Guided Today P1-P5 Frontend Shipped Handoff - 2026-05-15

## Repository Snapshot

- Repository: `lokigod69/resonance-cloud`
- Branch: `main`
- Canonical local repo: `D:\CODING\ResonanceTEST\orchestrator`
- HEAD after required sync: `bc7dbb0ad1c44f25deafbc193cbdca475887c3b9`
- `origin/main` after required sync: `22fd63842de84fb87254df9e2db949a9f00f8845`
- Local main clean: No. The working tree already had unrelated modified and untracked files outside this handoff; they were left untouched.

## Exposed Path IDs

The Guided Today path directory currently exposes exactly these A1 Practical paths:

- `english-a1-practical-1`
- `english-a1-practical-2`
- `english-a1-practical-3`
- `english-a1-practical-4`
- `english-a1-practical-5`

No A1P6, A2, category-practice, or language-expansion paths are exposed.

## Lesson and Vibe State

- P1-P5 each resolve to 10 lessons.
- P1-P5 each have active Bright, Wistful, and Sharp variants.
- P4 and P5 were already authored in `frontend/src/data/guidedLessons.ts` before directory exposure.
- Lesson content was untouched during P4/P5 exposure and this handoff.
- Sharp content was untouched during P4/P5 exposure and this handoff.
- Trophy words and trophy song/client code were untouched during P4/P5 exposure, Segment Review QA, and this handoff.

## Review Status

Segment Review:

- P1-P5 expose Segment Review 1 after lessons 1-5.
- P1-P5 expose Segment Review 2 after lessons 6-10.
- Segment Review plans sample only the selected path.
- P4/P5 Segment Review plans do not fall back to P1.
- Segment Review uses the current Type Recall cloze, German cue, then Speak pattern.
- P4/P5 Segment Review routes build without dedicated story scaffold copy by using the existing optional story fallback behavior.

Quick Review:

- Quick Review remains unchanged.
- It still uses the completion-gated checkpoint plan.
- It remains unavailable when no completed path exists.

Path Check:

- Path Check remains unchanged.
- It remains available from the path directory diagnostic action.
- Tests confirm Path Check samples only the selected path.

## Tests and Checks Run

- `npx tsx scripts/test-guided-path-directory.ts`
- `npx tsx scripts/test-guided-segment-reviews.ts`
- `npm run test:guided-today`
- `npm run check:i18n`
- `npm run build`
- `git diff --check`
- `git diff --cached --check`

## Remaining Gaps

- Authenticated browser QA remains blocked without credentials or an approved auth bypass.
- P4/P5 story scaffolds are missing in `frontend/src/lib/guidedSegmentStories.ts`.
- Sharp needs a future design pass, not a quick patch.
- P6-P10 spine is not yet approved.

## Recommended Next Implementation

1. Add P4/P5 segment story scaffolds.
2. Write the A1P6-A1P10 spine extension.
3. Implement P6 only after spine approval.

## Scope Guard

This handoff is docs-only. It does not change runtime files, lesson content, Sharp, review UI, trophy song/client code, backend, Supabase, generation, decks, words, credits, category practice, language expansion, A1P6, or A2.
