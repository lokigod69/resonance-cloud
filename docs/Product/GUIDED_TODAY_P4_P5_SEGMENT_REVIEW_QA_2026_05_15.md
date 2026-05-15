# Guided Today P4/P5 Segment Review QA - 2026-05-15

## Scope

Verified Segment Review behavior for the newly exposed Guided Today paths:

- `english-a1-practical-4`
- `english-a1-practical-5`

No runtime UI, lesson content, Sharp content, trophy song code, backend, Supabase, generation, category practice, language expansion, A1P6, A2, decks, words, or credits were changed.

## Files Changed

- `frontend/scripts/test-guided-segment-reviews.ts`
- `docs/Product/GUIDED_TODAY_P4_P5_SEGMENT_REVIEW_QA_2026_05_15.md`

## QA Result

P4 and P5 both expose Segment Review through the same path overview mechanism as P1-P3.
`TodayPathOverview.tsx` renders two segment review tiles from `GUIDED_SEGMENT_REVIEWS`:

- Segment Review 1 covers lessons 1-5.
- Segment Review 2 covers lessons 6-10.

The tile href uses the selected path id:

- `/today/checkpoint?mode=segment-review&path=${selectedPathId}&segment=${segment.segment}&vibe=${selectedVibeId}`

This means P4 and P5 route to their own selected path instead of falling back to P1.

## Test Coverage Added

`frontend/scripts/test-guided-segment-reviews.ts` now validates all five exposed paths for both segment reviews.
For each path and segment it confirms:

- the Segment Review plan builds five items,
- the selected segment is recorded,
- all items belong to the selected path,
- Segment Review 1 samples lessons 1-5,
- Segment Review 2 samples lessons 6-10,
- lessons stay in lesson-number order,
- every item has Type Recall cloze data,
- every item has German cue data,
- every item has Speak cue data.

The test also now explicitly checks A1 Practical 4 storage round-trip behavior and A1 Practical 5 availability with no completed lessons.

## Route and Pattern Verification

`GuidedCheckpoint.tsx` keeps the current Segment Review pattern:

- Segment Review mode uses `buildGuidedSegmentReviewPlan`.
- The type step uses `typeRecall.before`, the answer input, and `typeRecall.after`.
- The type step shows `corePhrase.baseText` as the German cue.
- After type feedback, the user advances to the Speak step.
- Speak uses the lesson's `speak.baseCue` and `speak.language`.
- Segment Review completion writes via `completeGuidedSegmentReview`, not normal Quick Review storage.

No review route crash was found in static/runtime-plan validation. P4 and P5 do not currently have story scaffold copy in `guidedSegmentStories.ts`; the route already treats story and scene text as optional, so Segment Review still builds and renders without story copy.

## Quick Review and Path Check

Quick Review remains unchanged:

- It still uses `buildGuidedCheckpointPlan(progress, selectedVibeId)`.
- It remains completion-gated.

Path Check remains unchanged:

- It still uses `buildGuidedPathCheckPlan`.
- It remains available from the path directory diagnostic action.
- The P4/P5 directory test continues to confirm Path Check samples only the selected path.

## Checks Run

- `npx tsx scripts/test-guided-segment-reviews.ts`: passed, 308 passed, 0 failed.
- `npx tsx scripts/test-guided-path-directory.ts`: passed, 66 passed, 0 failed.
- `npx tsx scripts/test-guided-today-data.ts`: passed, 4510 passed, 0 failed.
- `npx tsx scripts/test-guided-today-path-overview.ts`: passed, 141 passed, 0 failed. Existing weak generic review-item warnings remain out of scope.
- `npm run test:guided-today`: passed. Existing cross-vibe warn-only findings remain out of scope.
- `npm run check:i18n`: passed. Existing French missing-key warnings remain warn-only and out of scope.
- `npm run build`: passed. Existing Vite dynamic-import and chunk-size warnings remain out of scope.
- `git diff --check`: passed.
- `git diff --cached --check`: passed.

## Remaining Review Limitations

- P4 and P5 Segment Review routes currently use the base fallback heading because no P4/P5 story scaffold entries exist in `guidedSegmentStories.ts`.
- Browser-level authenticated QA was not attempted in this pass; the previous directory exposure QA found `/today` redirects to sign-in without local credentials or an approved auth bypass.
