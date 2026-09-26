---
name: ui-critic-loop
description: Score-driven visual refinement for a Lingwave screen using fresh critic agents on real rendered captures (0-10 scale, 8+ passes, at most three rounds). Use when asked to polish, refine or "make it look right" a visible surface, e.g. "run the critic loop on Trophy", "get the lesson overview to an 8". Not for functional bug fixes.
---

# UI critic loop

The method from the 2026-09-07 Today refinement (`memory/notes/today-critic-loop-2026-09-07.md`):
build, capture the real rendered UI, have a fresh critic score it, fix, repeat. It stops at a
score or a round cap, whichever comes first, and it reports the real score.

## Rules

- Scale 0-10; 8 or more passes. Three rounds at most unless the owner raises the cap. Never
  round a score up, replace a critic to get a pass, or run a fourth round silently.
- Each round uses a fresh critic agent that did not see earlier rounds' reasoning. Give it
  the captures, the screen's purpose, the brand rules (theme variables, cosmos island, waves
  never degrade) and the viewport list — not your own opinion of the design.
- Critics judge actual screenshots, never code or descriptions.
- Functional behaviour stays unchanged unless the critic finds a demonstrated defect; target
  phrases, grading rules and authored content are out of scope.

## Each round

1. Capture: from `orchestrator/frontend`, render the real components with the fixture
   harness (`node scripts/today-guided-fixtures/run.mjs`, `first-light-fixtures`,
   `speak-lens-fixtures`) at 320, 390 and 1440 px wide, in `en` and one lazy locale, including
   the empty, loading, error and completed states the screen has.
2. Critique: fresh critic returns a score, the three most important issues with the capture
   that shows each, and what already works.
3. Fix only what the critique names; keep i18n keys complete (`npm run check:i18n`).
4. Verify: `npm run verify`, `npm run test:local`, `npm run build`, and re-capture.

## Shipping

Visual experiments go to a Vercel preview deploy first (`vercel deploy` from
`orchestrator/`, no branch needed); production only after the round that reaches 8+, or with
the owner's call when the cap is reached. Record every round's score and the remaining issues
in the brain note and the handoff, as the Today loop did (7.0 → 7.6 → 7.8, target unmet).
