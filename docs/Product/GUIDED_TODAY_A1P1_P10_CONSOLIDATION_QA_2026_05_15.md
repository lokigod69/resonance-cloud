# Guided Today A1P1-P10 Consolidation QA

Date: 2026-05-15

## Git state

- Current HEAD SHA: `2b9646d5f2240d88602639df0c751cff8afa0216`
- origin/main SHA after sync: `2b9646d5f2240d88602639df0c751cff8afa0216`
- Local `main` synced cleanly with `origin/main` before this report.
- The working tree had pre-existing unrelated dirty/untracked files; this QA pass leaves them untouched.

## Files changed

- `docs/Product/GUIDED_TODAY_A1P1_P10_CONSOLIDATION_QA_2026_05_15.md`

Runtime files changed: no. This was a report-only consolidation pass.

## Exposed path ids

The Guided Today path directory exposes exactly:

- `english-a1-practical-1`
- `english-a1-practical-2`
- `english-a1-practical-3`
- `english-a1-practical-4`
- `english-a1-practical-5`
- `english-a1-practical-6`
- `english-a1-practical-7`
- `english-a1-practical-8`
- `english-a1-practical-9`
- `english-a1-practical-10`

No A2, category practice, or language-expansion paths are exposed by the directory.

## Lesson count summary

All exposed paths resolve exactly 10 lessons:

- P1: 10
- P2: 10
- P3: 10
- P4: 10
- P5: 10
- P6: 10
- P7: 10
- P8: 10
- P9: 10
- P10: 10

## Vibe coverage summary

Every lesson in P1-P10 has active Bright, Wistful, and Sharp variants. No future Tender, Bold, or Cheeky runtime variants are required for the active paths. Every path remains German -> English.

## Segment Review coverage summary

Every exposed path has:

- Segment Review 1 over lessons 1-5
- Segment Review 2 over lessons 6-10
- story scaffold entries for both segments
- exactly five review items per segment
- selected-path isolation, including P9 and P10 not sampling P1
- Type Recall cloze data, German cue data, and Speak cue data in review plan construction

The review UI was not redesigned.

## Path Check status

Path Check samples only the selected path for every exposed path. The tests confirm it does not mix lessons across P1-P10.

## Quick Review status

Quick Review remains completion-gated. The empty-progress case remains unavailable instead of exposing a broken empty-state review.

## Trophy word status

Trophy words are present for all active lesson variants. The cross-vibe test reports zero trophy collisions across the three vibes inside each lesson. Trophy song/client logic was not changed.

## Cross-vibe warning summary

Cross-vibe distinctness result:

- Pairs scanned: 300
- Hard failures: 0
- Trophy collisions: 0
- Allowlist hits: 2
- Warning-level similarities: 12

Warnings reported by the current test:

- `english-a1-practical-2` lesson 1 Bright/Sharp targetText score `0.730`
- `english-a1-practical-2` lesson 3 Bright/Wistful targetText score `0.714`
- `english-a1-practical-3` lesson 8 Bright/Wistful targetText score `0.708`
- `english-a1-practical-7` lesson 4 Bright/Wistful targetText score `0.739`
- `english-a1-practical-7` lesson 6 Bright/Wistful targetText score `0.765`
- `english-a1-practical-7` lesson 8 Bright/Wistful targetText score `0.704`
- `english-a1-practical-8` lesson 1 Bright/Wistful targetText score `0.714`
- `english-a1-practical-8` lesson 1 Bright/Sharp targetText score `0.800`
- `english-a1-practical-8` lesson 6 Bright/Sharp targetText score `0.714`
- `english-a1-practical-9` lesson 1 Bright/Wistful targetText score `0.727`
- `english-a1-practical-9` lesson 1 Bright/Sharp targetText score `0.750`
- `english-a1-practical-9` lesson 4 Bright/Wistful targetText score `0.720`

These are warning-level only. No broad content rewrite was made.

## German naturalness and diacritic status

The guided data test confirms German learner-facing fields avoid common ASCII transliterations, lost-byte diacritic corruption, and UTF-8 mojibake. No obvious typo-level German issue was found that justified a runtime change during this pass.

## P6 safety status

P6 health/pharmacy content passes the safety guard for diagnosis, dosage advice, treatment instruction, medical claims, and emergency-room overreach. The path remains practical A1 survival language.

## Fixes made

No runtime fixes were required. This pass created only the consolidation QA report.

## Checks run

- `git fetch origin`
- `git checkout main`
- `git pull --ff-only origin main`
- `git status -sb`
- `git log --oneline --decorate -15`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-segment-reviews.ts`
- `npx tsx scripts/test-guided-cross-vibe.ts`
- `npx tsx scripts/test-guided-path-directory.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npm run test:guided-today`
- `npm run check:i18n`
- `npm run build`
- `git diff --check`
- `git diff --cached --check`

## Remaining gaps

- Authenticated browser QA still requires credentials or an auth bypass.
- The cross-vibe warnings listed above remain warning-level content polish candidates.
- The current trophy song/client test coverage remains scoped to supported static trophy tuples and was not expanded in this pass.
- A2 remains intentionally unimplemented.

## Recommended next step

Run authenticated browser QA for `/today`, the path directory, P9/P10 overviews, Segment Review 1/2, Path Check, and Quick Review gating. After that, schedule a targeted content-polish pass for warning-level cross-vibe similarities rather than a broad Sharp or full-content rewrite.
