# Safe Cleanup Patch Plan — July 2026 launch-readiness pass

**Author:** Fable, 2026-07-06
**Rule of the pass:** every patch is small, evidence-backed, its own rollback-friendly commit,
and verified (tsc + eslint on changed files + full production build; pytest for Python).
Anything not meeting that bar is listed under "Later", not attempted.
**Companion docs:** `FABLE_CODE_CLEANUP_AUDIT_REPORT.md`, `FABLE_VIDEO_DEPRECATION_BOUNDARY.md`.

## Patch A — provably dead code (LANDED)

| Commit | What | Evidence |
| --- | --- | --- |
| `ade651bc` | Deleted `components/stages/*` (8 files — DAW stage panels incl. VideoPanel), `components/settings/StageSettings.tsx`, `pages/Settings.tsx`, `components/speak/GeminiAccentPicker.tsx`; dropped the one `fs.readFileSync('src/pages/Settings.tsx')` assertion in `scripts/test-phase1f0-credit-pricing.ts` | Zero importers (repo-wide grep incl. dynamic `import(` patterns), not in `routeImports.ts`, no route in `App.tsx`; mtimes checked against the concurrent session; tsc + full build green after deletion. −1,854 lines. |
| `baaeea7c` | Deleted `components/layout/AppSidebar.tsx` | Zero import hits; contained stale `/admin/costs` link (live route: `/admin/observability/cost`). Independently flagged by Codex sweep, verified by hand. −129 lines. |

Deliberately **not** deleted despite looking video/DAW-flavored:
- `src/api.ts` — still feeds `SettingsControls.controls.tsx` (voice/LoRA pickers) used by live
  admin Profiles. Pruning its now-unused exports is Later (L3).
- `components/settings/fieldConfigs.ts` (incl. `video_mode`/Ken Burns options) — admin
  Profiles editor uses `STAGE_FIELDS`/`STAGE_LABELS`/`StageSettingsPanel`. Admin surface, stays.

## Patch B — hide deprecated video UI (LANDED)

| Commit | What | Evidence |
| --- | --- | --- |
| `6b5991ce` | New `lib/productFlags.ts` with `VIDEO_LANE_ENABLED = false`; `ProductLaneStep.tsx` filters the video tile when the flag is off | The tile was the **only** remaining path to create a new video deck (all other video surfaces already orphaned from nav — see boundary doc). Shared component ⇒ one change covers both skins. Appending to existing video decks never renders this step (`GenerateGO.tsx:215`). Flag flip or revert restores it. |

Explicitly preserved (deep-link/admin/legacy support — see boundary doc): `/study/video`
routes, `VideoPlayer` route, deck-view video playback, SharePage video rendering, admin video
panels, `generate.productLane.video.*` i18n keys.

## Patch C — consolidate duplicated helpers (NOT ATTEMPTED, deliberate)

Candidates examined and rejected for this pass:
- **Classic vs PG/GO page pairs** (7 pairs, chosen by `skin === 'glassy'` in `App.tsx:223-266`).
  Real divergence, no test harness proving identical behavior, and a parallel product decision
  ("glassy-only for beta", `docs/Product/FABLE_TESTFLIGHT_FEATURE_STRATEGY.md`) may make half
  the pairs removable wholesale — consolidating now would be wasted/risky work. → Later (L1).
- **Study 2×2 file family** — same reasoning; session B's
  `FABLE_STUDY_AND_CARD_RENDERING_COHERENCE_PLAN.md` already owns this via `StudyCardFrame`.
- **Local `src/dispatcher.py` (HTTP) vs `src/cloud_dispatcher.py` (in-process)** — not true
  duplicates (different transports, one legacy-gated); merging is pipeline refactoring,
  explicitly out of scope.

The bar for any future Patch C: tests proving identical behavior first, consolidation second.

## Patch D — documentation (LANDED with this doc set)

- `README.md` rewritten: was describing the local DAW (port 8090, nonexistent `main.py`,
  per-engine HTTP ports) as the product; now describes the Vercel frontend + Railway worker
  reality, verification commands, and points to `memory/`, `docs/Stabilization/`, `docs/Refactors/`.
- This doc set (`FABLE_CODE_CLEANUP_AUDIT_REPORT.md`, `FABLE_VIDEO_DEPRECATION_BOUNDARY.md`,
  `FABLE_SAFE_CLEANUP_PATCH_PLAN.md`, plus Codex packet when delivered).
- Project brain installed at `memory/` (INDEX/STATE/DECISIONS/ARCHITECTURE/LOG).

## Later — ranked, with triggers (DO NOT do casually)

| # | Item | Why deferred | Trigger to act |
| --- | --- | --- | --- |
| L1 | Retire classic/PG page duplication | Needs the glassy-only-for-beta product decision (owner sign-off) | Decision lands → delete the losing set per pair, not merge |
| L2 | Remove now-unreachable video-lane wizard steps (vibe/art/niveau/genre in `GenerateGO.tsx:1062-1200` + GeneratePG equivalents) and their translation keys | Unreachable only *after* B; harmless; bigger diff than the value | Next cleanup pass, or when touching the wizard anyway |
| L3 | Prune unused exports from `src/api.ts` (DAW endpoints) | Live admin imports 3 helpers from it; partial prune is fiddly | When admin voice/LoRA pickers move to Supabase-native fetch |
| L4 | Decouple `start_cloud.py` boot gate from `POD_URL`/`POD_AUTH_TOKEN` (LTX pod) | Production behavior change to a fail-fast safety gate; env vars are currently set and harmless | Product confirms legacy video repair will never run again |
| L5 | Root clutter (`resonance_arch_compare_pack/`, `investigation/`, `manual_repair_enrichment_wedged_words.sql`, `ADVERSARIAL_REVIEW_*.md`, `start*.bat`, `build/`, `tmp/`) | Mix of tracked one-offs and untracked leftovers; zero runtime risk but archival value unclear | Owner says "archive it" → move tracked ones under `docs/archive/`, delete untracked |
| L6 | `videos` storage bucket carries card PNGs (`card_worker.py:710-783`) | Storage migration + possible schema touch; explicitly out of scope | A real storage-cleanup project with migration plan |
| L7 | VideoPlayer.tsx raw English strings (i18n) | Deep-link-only legacy surface; zero nav exposure for beta users | Only if video surfaces ever return to nav |
| L8 | Supabase schema: video columns on `words` | Schema changes need a proven launch blocker; none exists | Never, absent a blocker |

## Verification ledger

Per patch: `npm run typecheck` ✅, `npx eslint <changed files>` ✅ (0 new), full
`npm run build` ✅ after each deletion commit. `npm run check:i18n` + `git diff --check` run
at end of pass (no Python files were changed in this pass ⇒ no pytest needed).
