# Generation Wizard Lane Redesign — Implementation Report

**Date:** 2026-05-05
**Author:** Claude (Opus 4.7)
**Companion spec:** [GENERATION_WIZARD_LANE_REDESIGN_INVESTIGATION.md](GENERATION_WIZARD_LANE_REDESIGN_INVESTIGATION.md)
**Backend reference:** GPT Image-2 Quick Generate V1 — commit `a405769ad53599f59808972e6b484eec8d19e19b` (already on `main`).

---

## Summary

Promoted the card tier choice (Standard vs GPT Image-2) from a hidden detour after Words to a first-class **Product Lane** step right after Language. The wizard now offers three top-level lanes — **Video & Music**, **Standard Card**, **Premium Card** — and the "GPT Image-2" naming is gone from the user-facing copy.

No backend, RPC, pricing, prompt, or migration changes. The existing `submit_generation` RPC and `card_worker` already accept the wire format the frontend produces, as confirmed by the new payload-mapping test suite.

---

## Final Flow

| step | Video & Music | Standard Card | Premium Card |
|---|---|---|---|
| 1 | Language | Language | Language |
| 2 | **Product Lane → Video & Music** | **Product Lane → Standard Card** | **Product Lane → Premium Card** |
| 3 | Words / Category | Words / Category | Words / Category |
| 4 | Vibe | Visual Style (optional) | Visual Style (optional) |
| 5 | Art Style | Synthesis Ready | Synthesis Ready |
| 6 | Niveau | — | — |
| 7 | Genre | — | — |
| 8 | Synthesis Ready | — | — |

For any lane, **Quick Generate** from the Words step submits immediately with no further detour.

---

## Files changed

### Created
- `frontend/src/components/generate/steps/ProductLaneStep.tsx` — three-tile lane chooser. Supports `variant: 'all' | 'card-only'` and `skin: 'classic' | 'glassy'`. Card-only variant is used when appending to an existing card deck.
- `frontend/scripts/test-product-lane-payload.ts` — 40 assertions covering the lane → payload mapping, append-mode preselection, Quick Generate behavior.
- `docs/investigations/GENERATION_WIZARD_LANE_REDESIGN_IMPLEMENTATION_REPORT.md` — this file.
- `docs/investigations/GENERATION_WIZARD_LANE_REDESIGN_INVESTIGATION.md` — the prior design spec, included in the same commit.

### Modified
- `frontend/src/components/generate/useWizardState.ts` — `productLane` is now the source of truth. Added pure exported helpers `isCardLane`, `laneToDeckType`, `laneToCardImageModel`, `deckRowToProductLane`, and a pure `buildGeneratePayload({ state, userId, existingDeck, isQuickGenerate?, wordsOverride? })`. Removed the old `deckType` / `cardImageModel` state fields and the corresponding actions. `computeCreditCost(lane, wordCount)` replaces the old three-arg signature. Added `last_card_image_model` to `ExistingDeck`.
- `frontend/src/components/generate/steps/CardImageStyleStep.tsx` — stripped the "Choose card tier" panel. Component now only presents Realistic / Editorial / Random; the lane is decided earlier.
- `frontend/src/components/generate/steps/ConfirmStep.tsx` — derives the user-facing label from `state.productLane` ("Video & Music" / "Standard Card" / "Premium Card"). "GPT Image-2 Card" no longer appears here.
- `frontend/src/pages/GeneratePG.tsx` — replaced `DeckTypeStep` with `ProductLaneStep`. New step ordering: Language → Lane → Words → (cards: Visual Style → Review) | (video: Vibe → Art Style → Niveau → Music → Review). Quick Generate for cards no longer detours through the visual-style picker. Existing video decks lock to the Video lane; existing card decks land on a card-only lane chooser preseeded from the deck's most recent `generation_jobs.settings_override.card_image_model`. Submit goes through the shared `buildGeneratePayload` helper.
- `frontend/src/pages/GenerateGO.tsx` — same restructuring for the glassy skin. Lane choice is the second section. Quick Generate from Words submits straight to the backend for both card and video lanes. Append-cards mode follows the same locking / preselect rules.
- `frontend/src/lib/translations.ts` — added `generate.productLane.*` keys (en, de, fr) and `generate.cardImageStyle.titleStyleOnly` / `generate.cardImageStyle.styleBreadcrumb`. Old `generate.deckType.*` and `generate.cardImageStyle.*` keys are kept (untouched) so we don't break any other consumer of the translation dictionary.
- `frontend/src/components/generate/wizardData.ts` — removed the unused `STEP_LABELS` constant (only the deleted `GenerateWizard` referenced it).
- `frontend/package.json` — new `test:lane-payload` script.

### Deleted
- `frontend/src/components/generate/GenerateWizard.tsx` — was unrouted dead code; would have rotted with the new state shape.
- `frontend/src/components/generate/WizardProgress.tsx` — only consumer was `GenerateWizard`.
- `frontend/src/components/generate/steps/DeckTypeStep.tsx` — replaced by `ProductLaneStep`.
- `frontend/src/components/generate/steps/VibeStep.tsx`, `ArtStyleStep.tsx`, `MusicStep.tsx` — only consumer was `GenerateWizard`. The live skins (`GeneratePG`, `GenerateGO`) use their own inline implementations.

### Intentionally NOT changed
- All backend code: `cloud_engines/image_engine/*`, `card_worker.py`, `feeder.py`, `pipeline.py`.
- The `submit_generation` RPC and pricing SQL.
- All migrations.
- GPT Image-2 prompt architecture, renderer profiles (`balanced_teaching` etc.), Layer 2 controls.
- Admin tooling: `frontend/src/components/admin/WordDetailPanel.tsx`, `frontend/src/pages/admin/Content.tsx`, `frontend/src/components/settings/fieldConfigs.ts` (these still reference `card_image_model` for admin / debug use, and stay untouched).

---

## Payload mapping (verified by `test:lane-payload`)

```
productLane === "video"
  → deckPayload.deck_type = "video"
  → jobPayload.settings_override has NO card_image_model, NO card_image_style

productLane === "card_standard"
  → deckPayload.deck_type = "card"
  → deckPayload.art_style = null, movie_override = null
  → jobPayload.settings_override.card_image_model = "zturbo"
  → jobPayload.settings_override.card_image_style is included only when set

productLane === "card_premium"
  → deckPayload.deck_type = "card"
  → deckPayload.art_style = null, movie_override = null
  → jobPayload.settings_override.card_image_model = "gpt_image_2"
  → jobPayload.settings_override.card_image_style is included only when set
```

Quick Generate additionally drops video-only customisations (`creative_direction`, `genre`, `lyric_mode`, `art_style`, `movie_override`) so a "skip the optional steps" submit doesn't carry stale state the user never confirmed.

---

## Quick Generate behavior

- **Card lanes (Standard or Premium):** the user picks the lane at step 2, types/picks words, then presses Quick Generate. The payload is submitted immediately with `card_image_model` derived from the lane and no `card_image_style` (backend defaults to Photorealistic). The visual-style step is no longer on the path.
- **Video lane:** unchanged — Quick Generate submits immediately with `settings_override = {}` and `art_style` / `movie_override` nulled.
- **Customize button** (in `WordsStep`) still routes to the per-lane optional steps (Visual Style for cards; Vibe → Art Style → Niveau → Music for video).

---

## Append-cards behavior

When `?deckId=…` is present, both pages now:

1. Load the deck row.
2. If `deck_type === 'card'`, additionally read the most recent `generation_jobs.settings_override.card_image_model` for that deck (1 extra `select` on `generation_jobs`, ordered desc, `limit(1)`).
3. Preseed `productLane`:
   - Video deck → `video` (lane is locked, lane step is skipped).
   - Card deck with last `gpt_image_2` → `card_premium` (lane step is shown in card-only variant, mutable).
   - Card deck with last `zturbo` or no history → `card_standard` (same).
4. Skip the Language step (language is locked to the deck's `target_language`).

The user can still flip Standard ↔ Premium on a card deck. They cannot turn a video deck into a card deck (or vice versa) — the lane step shows the card-only variant for card decks, and is hidden entirely for video decks.

This requires no DB migration: the card_image_model lives on `generation_jobs.settings_override`, which is already populated.

---

## Tests / checks run

| check | command | result |
|---|---|---|
| Lane → payload mapping (40 assertions) | `npm run test:lane-payload` | ✅ 40 passed, 0 failed |
| TypeScript / Vite production build | `npm run build` | ✅ build succeeded, no TS errors |
| Standalone TypeScript noEmit on app project | `npx tsc --noEmit -p tsconfig.app.json` | ✅ exit 0 |
| ESLint on changed files | `npx eslint src/components/generate src/pages/GeneratePG.tsx src/pages/GenerateGO.tsx scripts/test-product-lane-payload.ts` | ✅ exit 0 |
| `git diff --check` (whitespace) | run in commit step | clean |

The new payload test asserts:
- `productLane=video` payload has no `card_image_model` and no `card_image_style`.
- `productLane=card_standard` payload has `card_image_model=zturbo`, deck_type=card, art_style and movie_override nulled.
- `productLane=card_premium` payload has `card_image_model=gpt_image_2`, same nulling.
- Quick Generate strips `creative_direction`, `genre`, `lyric_mode`, `art_style`, `movie_override`.
- Append-cards on a video deck cannot inject a `card_image_model`.
- Append-cards on a card deck preselects `card_image_model` from the last job, defaults to `zturbo` when there is no history, and respects an explicit user override.

The pre-existing `test:phase1f0:credits` script (which exercises backend pricing through the live RPC) was not invoked because it requires a Supabase service-role key the implementer doesn't have access to in this run; the pricing SQL was not modified.

---

## Manual frontend smoke instructions

These are short browser checks Sir Robert can run after pulling. They cover the golden paths the automated tests cannot.

1. **Video lane, full custom path**
   - `npm run dev` → `/generate`.
   - Pick a language → see "Which product?" with three tiles.
   - Pick "Video & Music".
   - Add 2–3 words manually.
   - Press "Customize".
   - Walk through Vibe → Art Style → Niveau → Genre → Synthesis Ready.
   - Click Initialize → expect a deck with `deck_type=video` and no `card_image_model` in the job's `settings_override`.

2. **Standard Card, Quick Generate**
   - `/generate` → language → "Standard Card".
   - Type "heimweh" → Quick Generate.
   - Expect immediate submit (no Visual Style screen). Job should be created with `settings_override.card_image_model = "zturbo"`, deck `deck_type = "card"`, 1 credit charged.

3. **Premium Card, Quick Generate**
   - `/generate` → language → "Premium Card".
   - Type "die Leiter" → Quick Generate.
   - Expect immediate submit. Job should have `settings_override.card_image_model = "gpt_image_2"`, 5 credits charged. Backend smoke earlier confirmed this routes through the GPT pipeline with the auto `balanced_teaching` profile.

4. **Premium Card with Visual Style customise**
   - Same as 3, but press "Customize" instead of Quick Generate. Pick "Editorial". Submit. Expect `card_image_model = "gpt_image_2"` and `card_image_style = "Editorial"` on the job.

5. **Append to existing video deck**
   - From a deck view, click "Add Cards" on a video deck → expect to land directly on the Words step (no language, no lane chooser). Expect submit to remain video.

6. **Append to existing card deck**
   - "Add Cards" on a deck whose last cards were Standard → expect lane chooser pre-selected to Standard Card, only the two card tiles visible.
   - Switch to Premium Card explicitly → submit should now produce `card_image_model = "gpt_image_2"`.

7. **Confirm-screen copy**
   - In any flow, the Confirm / Synthesis Ready screen should say **"Standard Card"** or **"Premium Card"** — never "GPT Image-2 Card".

---

## Risks remaining

1. **Visual smoke not run by Claude.** No browser was opened in this session. Item 1–7 above need a human pass.
2. **i18n fr/de coverage**: French and German translations for the new keys were added, but I did not have a translator review them. They are accurate but slightly literal ("Cinematische Bildkarte mit stärkerer Komposition.").
3. **Append-mode last-job query** is unindexed in the obvious way; on decks with very large histories it might be a few-ms cost. The query is `select settings_override from generation_jobs where deck_id=$1 order by created_at desc limit 1` — there is an index on `generation_jobs.deck_id` already in the schema (Phase 1B), so this is fine in practice.
4. **Old translation keys retained.** I deliberately left `generate.deckType.*` and `generate.cardImageStyle.*` (apart from the new style-only sub-keys) in the dictionary in case any other surface still calls them. A follow-up cleanup PR can remove them after a grep confirms zero callers.
5. **GenerateWizard / Wizard step components deletion**: I deleted four step files (Vibe, Art Style, Music, DeckType) plus GenerateWizard and WizardProgress. I verified no remaining imports, but a future contributor who consults git history will need to know these moved into `GeneratePG` / `GenerateGO` inline.
6. **Mobile QA at 360px** — the lane step now has three tiles instead of two. They stack vertically below `sm:`, so this should be safe, but a screenshot pass is recommended.

---

## What this does NOT touch (re-stated)

- Backend provider routing, `cloud_engines/image_engine/*`.
- GPT Image-2 prompt architecture, `gpt_card_prompts.py`.
- Renderer profile selection (Layer 1 stays auto / `balanced_teaching`).
- Layer 2 controls (typography, speech bubble, text overlay) — none surfaced.
- Pricing logic in `submit_generation`.
- DB migrations.
- Video / music backend behavior.
- Standard / Z-Turbo backend behavior.
