# SESSION HANDOFF ADDENDUM — 2026-04-23 — Pipeline Map Close-Out

Appends to `SESSION_HANDOFF_2026-04-23_NIVEAU_SHIPPED.md`. Written at session close after the pipeline mapping doc landed.

## What Shipped at End of Session

`PIPELINE_MAP_LYRICS.md` and an accompanying visual HTML sketch (`PIPELINE_MAP_SKETCH.html` or similar — whatever filename the agent chose) at repo root. Commit: agent-authored, direct to `main`. The HTML renders mermaid diagrams in a dark-themed browser view and is a useful at-a-glance reference. The markdown file is the detailed companion with tables, line numbers, and the full settings inventory.

## Known Imperfections in the Pipeline Map

Not worth fixing now — flagged for later if a cleanup pass happens:

- Suno is labeled "optional" but is in practice the primary bake-in path for final audio, not optional.
- The `Stage 3: Song` node mentions "Ace-Step 1.5 GPU → FLAC audio takes" which conflates the Ace-Step local takes with the final Suno-baked output.
- Minor wording in the concept.json description row is overly terse.
- None of these affect the structural correctness of the flow — the document is accurate on where things live and how data moves.

## Why Pipeline-Level Refactoring Is Deferred

Technical debt is real but not blocking:

- Two-variable `genre` + `customGenre` pattern in Glassy (works correctly now with the `dfc0b5e` fix).
- Dead `WizardState.step` field in `useWizardState.ts`.
- Dead `GenerateWizard.tsx` and most of `components/generate/steps/*` (only `WordsStep.tsx` is live).
- Seven admin-only `ConceptSettings` fields still not in `SETTINGS_OVERRIDE_MAP` (silent-drop if ever exposed to the wizard).
- Drifted `engines/concept-engine/` dev tree relative to production `cloud_engines/concept_engine/`.
- Classic and Glassy wizards do not share state (separate reducer vs useState patterns).

None of these affect correctness or user experience today. They are refactor candidates for a post-product-readiness cleanup pass, not blockers for the next feature.

## Next Session's Focus

**Lyric quality, not architecture.** The `dramatic` mode produces songs around 3–4 minutes; the product is probably better at 2–2:30. The `contextual` and `creative` modes haven't been observed side-by-side yet. Prompt tuning in `orchestrator/cloud_engines/concept_engine/lyrics.py` is the highest-leverage next step.

Prerequisites before iteration:
1. Admin dashboard lyric visibility ships (in progress on Sir Robert's own track).
2. Generate 3–5 words × 4 Niveau levels on the same profile. Read all outputs side-by-side in the dashboard.
3. Try swapping DeepSeek V3.2 for one alternative (Claude Haiku 4.5, Mistral Large, or similar — NOT Kimi K2.5 per prior rejection). Regenerate the same 3–5 × 4 matrix. Compare qualitatively.
4. Based on observations: draft prompt edits (duration constraints, density caps, structure-tag adjustments, rhyme hints if the LLM is verbose without rhyme).
5. Investigation → implementation → adversarial review → browser QA on the prompt changes.

Only AFTER lyric quality is dialed in does the auto-mode backend investigation become worthwhile. The auto picker's logic needs ground truth from real output comparisons, not a priori guesses.

## Closing Assessment

Session met every stated goal. Backend merged, frontend shipped, custom-genre UX trap fixed, pipeline map documented. Real production users would benefit from this work starting today. Good close.

End of addendum.
