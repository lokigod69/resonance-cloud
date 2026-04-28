# SESSION HANDOFF — 2026-04-23 — Niveau Feature End-to-End

## Session Summary

Shipped the Niveau feature all the way to production. Backend merged to main, frontend wizard step landed on both skins with EN/DE/FR translations, and a custom-genre regression was caught in manual testing and fixed the same session. The feature works end-to-end: user picks a Niveau level, the wizard writes `lyric_mode` into `settings_override`, the backend routes it through `SETTINGS_OVERRIDE_MAP` into `ConceptSettings`, and the concept engine's LLM produces lyrics matching the level. Custom genre now also ships correctly across both skins regardless of whether the user presses the green confirm button.

---

## What Got Shipped

### Commit `1963f57` — backend merge

- Merged `feat/lyric-levels-backend` into main (3-way, no conflicts)
- `SETTINGS_OVERRIDE_MAP` in `job_runner.py:98` now routes `"lyric_mode" → ("concept", "lyric_mode")`
- Concept engine gets full LLM path for `contextual` / `creative` / `dramatic` modes; `reliable` stays template-based (0 LLM calls)
- `[Intro] {article} {word}` opener is deterministically prepended in post-processing, not baked into the LLM prompt
- 33/33 concept-engine tests passing on main
- Old `generate_dramatic()` template deleted

### Commit `3a4755b` — frontend Niveau wizard step

- New wizard step "Niveau" between Kunststil and Musik on both Classic (GeneratePG) and Glassy (GenerateGO)
- Five bubbles: Auto · Standard · Phrase · Story · Song → `null` / `"reliable"` / `"contextual"` / `"creative"` / `"dramatic"`
- Auto omits `lyric_mode` from payload entirely (falls back to profile default)
- 13 translation keys × 3 locales (EN/DE/FR) — DE/FR gap on pre-existing `generate.step*` keys NOT backfilled (out of scope)
- Direct-to-main per saved preference
- Adversarial review returned SHIP verdict

### Commit `dfc0b5e` — custom genre fixes

- **Classic UX trap:** StepMusic's Continue button now auto-dispatches `SET_GENRE` with trimmed custom text before advancing. Users who type a custom genre and press Continue without the green confirm button now ship their real genre instead of the literal string `"custom"`.
- **Glassy latent bug:** `handleCustomGenreConfirm` now calls `setGenre(customGenre.trim())` before `setStep(7)`. Pre-existing bug that was surfaced during manual testing.
- Pre-Niveau bug (not our regression) for Glassy; Classic issue is a UX trap that's been there forever but surfaced because Niveau testing hit the custom-genre path.

---

## Current State (Live on resonanz.pro)

- Niveau feature works end-to-end across both skins
- Custom genre now reliably ships whatever the user types
- `dramatic` mode produces full songs (~3 min, sometimes 4+ min — too long, to investigate)
- DeepSeek V3.2 is the concept engine's LLM (handles lyrics for contextual/creative/dramatic)
- Grok 4.1 Fast is the image engine's LLM (handles storyboards + music_caption)
- Both models independently configurable per language profile
- Admin panel can override `lyric_mode` per profile as before — that path was never broken

---

## What Is NOT Yet Built / Deferred

### Deferred deliberately
- **Auto-mode backend (storyboard-fed lyric picker).** Paused until lyric quality baseline is established. Designing a picker without knowing what good output looks like across levels is premature. Originally "step four" in the earlier plan — still the right next major feature, just sequenced later.
- **Lyric quality comparison pass.** Needs the admin dashboard (in progress separately) so lyrics can be read directly. Once ready: generate 3–5 words × 4 levels on same profile, compare, then try swapping concept-engine LLM (DeepSeek V3.2 → Claude Haiku 4.5 or Mistral Large or similar candidates) and compare again.
- **Lyric prompt tuning.** Current `dramatic` songs run long. Prompts may need explicit duration constraints, density caps, BPM hints. All blocked on dashboard visibility.

### Trivial cleanups deferred (adversarial review nits)
- Dead `WizardState.step` field in `useWizardState.ts` (unused by live wizards)
- Stale comment `/* ─── Step 5: Review ──` at GeneratePG.tsx:733 (should say Step 6)
- No Niveau summary chip on the review/initialize confirmation screen (users can't see at a glance which Niveau they picked before submitting). Missing this UI made the genre debug session harder this time.

These can ride along with any future edits to the same files rather than shipping solo.

### Pipeline mapping (being produced in parallel)
A separate read-only investigation prompt has been dispatched to produce `PIPELINE_MAP_LYRICS.md` — a visual reference document (Mermaid diagrams + tables) mapping how word input flows through concept engine → image engine (music_caption) → song engine → Suno, with every LLM call, every settings override point, and every injection site documented. This is the reference doc for all future lyric-quality work. See `PIPELINE_MAPPING_LYRICS.md` prompt in outputs folder.

---

## Immediate Next Steps (in order)

1. **Admin dashboard for lyric visibility.** In-progress on Sir Robert's own track. Blocks everything downstream.
2. **Pipeline mapping doc lands.** Reference it going forward for any prompt tuning, LLM swaps, or injection-point work.
3. **Lyric quality pass** — once dashboard ships:
   - Generate 3–5 words × 4 Niveau levels, same profile, same LLM. Read all 12–20 outputs side-by-side.
   - Document observations: duration, density, rhyme quality, pronunciation feel, genre adherence.
   - Swap concept-engine LLM to one or two candidates (NOT Kimi K2.5 — rejected). Repeat test. Compare.
   - Iterate prompts in `orchestrator/cloud_engines/concept_engine/lyrics.py` based on findings.
4. **Auto-mode backend investigation.** Only AFTER lyric quality is solid. The picker logic has to be informed by real output observations, not a priori guesses.
5. **Orb animation restoration** (pending from prior session, unrelated to Niveau).
6. **Suno permanent audio storage backfill** (unrelated, still pending).

---

## Reports Generated This Session

At repo root:
- `INVESTIGATION_REPORT_LYRIC_LEVELS_FRONTEND.md` — frontend routing + wire contract investigation
- `REVIEW_REPORT_LYRIC_LEVELS_FRONTEND.md` — adversarial review, verdict SHIP
- `INVESTIGATION_REPORT_GENRE_REGRESSION.md` — genre bug investigation (verdict: PRE-EXISTING_NOT_OUR_REGRESSION for Glassy; Classic UX trap surfaced by Sir Robert's manual retest)

---

## Process Notes / Learnings

- Investigation prompts must require verification against `origin/main` explicitly (not local refs). An earlier investigation in this session incorrectly claimed the backend was already on main when it was only on a local branch. Wasted one dispatch.
- Implementation prompts must explicitly ban popup question widgets — the agent used one this session despite the saved preference against them. Fixed going forward via explicit clause in every new prompt.
- The `SETTINGS_OVERRIDE_MAP` silent-drop pattern (keys absent from map are dropped without error) bit us once at the gateway layer and once at `merge_settings()`. Any future wizard field needs explicit verification at BOTH layers before shipping. The pipeline mapping doc should surface this pattern.
- Manual browser verification remains essential — the custom genre regression would NOT have been caught by the adversarial code review (it's a UX trap that requires clicking through to reproduce). Reviews and manual QA are complementary, not redundant.

---

## Open Questions for Next Session

1. Does the 4-minute `dramatic` song length indicate the Suno prompt lacks a duration constraint, or is the lyric string itself too long? (Dashboard will answer.)
2. Does swapping the concept-engine LLM from DeepSeek V3.2 meaningfully change lyric quality? Which candidate is the strongest alternative?
3. Should the Glassy genre step mirror Classic's `confirmCustom` pattern more closely, or keep its current two-state `genre`+`customGenre` structure (now that the one-line fix makes it behave correctly)?
4. Is the `dramatic` mode appropriate as the "Song" user-facing bubble label, or should the mode name change now that real output has been observed?

---

## Key Files Touched This Session

Backend:
- `orchestrator/job_runner.py`
- `orchestrator/cloud_engines/concept_engine/lyrics.py`
- `orchestrator/cloud_engines/concept_engine/engine.py`
- `orchestrator/cloud_engines/concept_engine/templates.py`
- `orchestrator/tests/test_concept_lyric_levels.py` (+ fixture)

Frontend:
- `orchestrator/frontend/src/components/generate/useWizardState.ts`
- `orchestrator/frontend/src/lib/translations.ts`
- `orchestrator/frontend/src/pages/GeneratePG.tsx`
- `orchestrator/frontend/src/pages/GenerateGO.tsx`

End of handoff.
