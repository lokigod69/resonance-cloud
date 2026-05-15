# Guided Today A1 Practical P1-P10 Session Handoff

Date: 2026-05-15

## Current repository snapshot

- Branch: `main`
- HEAD SHA: `ab905f48788d5680c9c28a96ca33edaa13462501`
- origin/main SHA: `ab905f48788d5680c9c28a96ca33edaa13462501`
- Local main clean: no. The working tree had unrelated pre-existing modified and untracked files before this handoff; this pass is docs-only and does not change runtime files.

## What was achieved

- Guided Today English A1 Practical P1-P10 are implemented.
- All 10 A1 Practical paths are exposed in the Guided Today path directory.
- Each exposed path has exactly 10 lessons.
- Each lesson has active Bright, Wistful, and Sharp variants.
- German -> English remains the active pair.
- Segment Review story scaffolds exist for every path and both path segments.
- Path Check and Quick Review remain wired.
- No A2, category practice, language expansion, backend, Supabase, generation, decks, words, credits, or trophy song/client changes were part of the A1 P1-P10 shipped state.

## Exact exposed path ids

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

## Current QA status

- Guided data tests pass.
- Segment Review tests pass.
- Path directory tests pass.
- Path overview tests pass.
- Cross-vibe has zero hard failures.
- Cross-vibe has zero trophy collisions.
- Cross-vibe has 12 warning-level similarities.
- `npm run test:guided-today` passes.
- `npm run check:i18n` passes with existing French warn-only gaps.
- `npm run build` passes with existing Vite warnings.

## Cross-vibe warning-level similarities

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

## Interpretation

- There is no hard blocker in the P1-P10 Guided Today implementation.
- A product quality issue remains around warning-level vibe similarity.
- P7-P9 especially need targeted vibe distinctness polish.
- The issue is not only Sharp; Bright/Wistful sometimes collapse into the same targetText.
- Avoid a broad rewrite.
- Preserve lesson goals, trophy words, and A1 simplicity.

## Recommended next work

Step 1: Targeted cross-vibe similarity cleanup for the 12 warning-level similarities listed above.

Step 2: Authenticated browser QA for `/today`.

Step 3: Manual review of P1, P10 directory selection, P9/P10 overviews, Segment Review, Path Check, and Quick Review gating.

Step 4: Only after that, decide whether to start an A2 spine or German -> Spanish architecture.

## Explicit non-goals

- No A2 yet.
- No other languages yet.
- No category practice.
- No backend or Supabase progress sync.
- No trophy song expansion.
- No global Sharp rewrite.
- No broad content rewrite of all P1-P10.

## Continuation Prompt For Next Chat

You are continuing Resonance Guided Today after English A1 Practical P1-P10 were implemented, exposed, and consolidated. Repository: `lokigod69/resonance-cloud`, branch `main`, canonical local repo `D:\CODING\ResonanceTEST\orchestrator`.

Start with targeted cross-vibe similarity cleanup for the 12 warning-level similarities documented in `docs/Product/GUIDED_TODAY_A1P1_P10_SESSION_HANDOFF_2026_05_15.md`, then run authenticated browser QA for `/today`. Do not do a broad rewrite. Preserve lesson goals, trophy words, A1 simplicity, review UX, trophy song/client code, backend, Supabase, category practice, language expansion, and A2 scope.
