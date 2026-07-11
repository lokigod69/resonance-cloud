# Generation Wizard Lane Redesign — Investigation & Design Spec

**Status:** Investigation only. No code change. Awaiting Sir Robert's approval.
**Author:** Claude (Opus 4.7)
**Date:** 2026-05-05
**Backend reference commit:** `a405769ad53599f59808972e6b484eec8d19e19b` (GPT Image-2 Quick Generate V1, on `main`).
**Backend smoke confirmed:** GPT Image-2 1K / 16:9, no fallback, balanced_teaching auto profile, GPT metadata at `words.metadata.gpt_image_2_card`.

---

## TL;DR

Today the "card tier" choice (Standard vs GPT Image-2) is hidden inside a step labelled "Choose card tier / Visual style", which sits **after** the user has chosen a generic deck type and entered words. Visual style and card tier are bundled into a single screen, which conflates *what product am I buying* with *what aesthetic do I want*. The frontend already sends a correct payload (`deck_type=card`, `settings_override.card_image_model=zturbo|gpt_image_2`), so the backend contract does not need to change. The fix is a pure UX restructuring of the wizard so that **product lane is chosen as Step 2**, immediately after language, and split into three first-class lanes:

1. Video & Music
2. Standard Card
3. Premium Card

Visual style remains a separate optional concern *inside* a card lane and never decides Standard vs Premium.

---

## 1. Current Flow Map

### Live entry point
- [App.tsx:136](frontend/src/App.tsx#L136) routes `/generate` → `GenerateGO` (the **glassy** skin).
- [Generate.tsx](frontend/src/pages/Generate.tsx) re-exports `GeneratePG` (the **classic** skin) but is **not currently routed** anywhere — it appears to be legacy/standby.
- [GenerateWizard.tsx](frontend/src/components/generate/GenerateWizard.tsx) is **dead code** as of today: no caller imports it. Its handler logic is still referenced in a comment in [GeneratePG.tsx:100](frontend/src/pages/GeneratePG.tsx#L100) ("mirrors GenerateWizard.handleGenerate") but the file itself is not used.

### `GenerateGO` (live, glassy) — step sequence

| step | section | purpose |
|---|---|---|
| 1 | Language | Choose target language. |
| 2 | Deck Type | `DeckTypeStep` with two tiles: *Video and Music* (10 cred/word) and *Card Deck* ("Standard starts at 1 credit"). |
| 3 | Words | `WordsStep` — manual entry / category picker; shows a Quick Generate orb. |
| 4 (card) | `CardImageStyleStep` (skin=glassy) | Renders **two stacked panels in one screen**: a "Choose card tier" group with two tiles (Standard Card / **GPT Image-2 Card**) and a "Visual style" group (Realistic / Editorial / Random). |
| 5 (card) | Synthesis Ready | Final review + Initialize button. |
| 4 (video) | Vibe (auto / cinematic / movie / specific_movie / …) | |
| 5 (video) | Art Style (massive grouped picker) | |
| 6 (video) | Niveau (lyric mode) | |
| 7 (video) | Genre | |
| 8 (video) | Synthesis Ready | Final review + Initialize. |

The card branch and the video branch share Step 1 (Language), Step 2 (Deck Type) and Step 3 (Words), then diverge.

### `GeneratePG` (classic, currently unrouted but maintained)

| pgStep | branch | screen |
|---|---|---|
| 0 | both | `StepLanguage` |
| 1 | both | `DeckTypeStep` (skin=classic) |
| 2 | both | `WordsStep` |
| 3 | card | `CardImageStyleStep` (skin=classic) — same combined "Choose card tier + Visual style" screen as glassy |
| 4 | card | `StepReview` |
| 3 | video | `StepVibe` |
| 4 | video | `StepArtStyle` |
| 5 | video | `StepNiveau` |
| 6 | video | `StepMusic` (genre) |
| 7 | video | `StepReview` |

### Where the card-tier choice currently lives
- `CardImageStyleStep` ([frontend/src/components/generate/steps/CardImageStyleStep.tsx](frontend/src/components/generate/steps/CardImageStyleStep.tsx)). It mixes **both** product tier (`zturbo` / `gpt_image_2`) **and** visual style (`Photorealistic` / `Editorial` / `Random`) on the same screen.
- The user-facing label on the GPT tile is "GPT Image-2 Card" with helper "Premium GPT image card, 5 credits". This is technical-sounding and is what Sir Robert is renaming to **Premium Card**.

### Where Realistic / Editorial / Random live
- Same component, lower panel (`tiles` array in [CardImageStyleStep.tsx:35-48](frontend/src/components/generate/steps/CardImageStyleStep.tsx#L35-L48)).
- Glassy renders them as orbs; classic as `GlassCard`s.

### Wizard state (used by `GeneratePG` and the dead `GenerateWizard`)
- [useWizardState.ts:4-18](frontend/src/components/generate/useWizardState.ts#L4-L18):
  - `deckType: 'video' | 'card' | null`
  - `cardImageModel: 'zturbo' | 'gpt_image_2'` (default `'zturbo'`)
  - `cardImageStyle: 'Photorealistic' | 'Editorial' | 'Random' | null`
  - `vibe`, `artStyle`, `genre`, `lyricMode`, `movieTitle` — video-only fields.
- `GenerateGO` does **not** use this reducer. It re-implements all those fields with `useState` ([GenerateGO.tsx:37-56](frontend/src/pages/GenerateGO.tsx#L37-L56)) and uses an inline adapter to feed `WordsStep` ([GenerateGO.tsx:151-187](frontend/src/pages/GenerateGO.tsx#L151-L187)).
  - **Consequence:** any structural state change (e.g. a new `productLane` enum) must be applied **twice**.

---

## 2. Current Payload Map

The frontend posts to a single Postgres RPC `submit_generation` ([20260503120000_gpt_image_2_card_pricing.sql](frontend/supabase/migrations/20260503120000_gpt_image_2_card_pricing.sql)). The wire shape is in [submitGeneration.ts](frontend/src/components/generate/submitGeneration.ts):

```
rpc('submit_generation', {
  p_deck_payload, p_word_list, p_job_payload, p_existing_deck_id, p_idempotency_key
})
```

### Backend contract (authoritative, from the SQL)
- `p_deck_payload->>'deck_type'` — `'video'` | `'card'`. For existing decks, the RPC ignores this and reuses `decks.deck_type`.
- `p_job_payload->'settings_override'->>'card_image_model'` — `'zturbo'` | `'gpt_image_2'`. Required only when `deck_type='card'`. Backend re-injects the resolved model into `settings_override` so the worker is guaranteed to see it ([SQL:113-126](frontend/supabase/migrations/20260503120000_gpt_image_2_card_pricing.sql#L113-L126)).
- Pricing is computed **server-side**: video=10/word, gpt_image_2=5/word, else 1/word ([SQL:128-133](frontend/supabase/migrations/20260503120000_gpt_image_2_card_pricing.sql#L128-L133)). Frontend `computeCreditCost` is display-only.
- The job worker reads `images_settings.get("card_image_style")` and `images_settings.get("card_image_model")` ([card_worker.py:269-273](src/orchestration/card_worker.py#L269-L273)). Note the two-level shape: `settings.images.card_image_*`. The transformation from `generation_jobs.settings_override` (flat) to `deck_context.settings.images` happens in the orchestration pipeline (out of frontend scope).

### What the frontend actually sends today

**Video & Music** (custom path, GenerateGO):
```jsonc
deckPayload: { deck_type: "video", art_style, movie_override, ... }
jobPayload: {
  art_style, movie_override,
  settings_override: { creative_direction?, genre?, lyric_mode? }
}
```
✅ No `card_image_model` is sent. ✅ Matches target.

**Standard Card** (GenerateGO, after picking the Standard tile):
```jsonc
deckPayload: { deck_type: "card", art_style: null, movie_override: null, ... }
jobPayload: {
  art_style: null, movie_override: null,
  settings_override: { card_image_model: "zturbo", card_image_style: "Photorealistic" }
}
```
✅ Correct.

**Premium / GPT Image-2 Card** (GenerateGO, after picking the GPT tile):
```jsonc
deckPayload: { deck_type: "card", art_style: null, movie_override: null, ... }
jobPayload: {
  art_style: null, movie_override: null,
  settings_override: { card_image_model: "gpt_image_2", card_image_style: "Photorealistic" }
}
```
✅ Correct.

**Quick Generate** from `WordsStep`, glassy skin:
- Behavior at [GenerateGO.tsx:191-204](frontend/src/pages/GenerateGO.tsx#L191-L204): if `deckType === 'card'`, *do not* submit yet — push the user to step 4 (`CardImageStyleStep`) so they pick a card tier and visual style. If video, submit immediately.
- This means **Quick Generate for cards is, in effect, "skip vibe/art/niveau/genre"** — but the user is still required to choose tier + visual style. This is what the smoke test exercised.

**Quick Generate from inside `GeneratePG`** (classic, useWizardState reducer):
- [GeneratePG.tsx:163-173](frontend/src/pages/GeneratePG.tsx#L163-L173): same logic — for cards, advance to `pgStep=3` (CardImageStyleStep). For video, build the payload with `art_style=null, movie_override=null, settings_override={}` and submit.

**Append-to-existing-deck**, both skins:
- Existing deck is loaded by id and its `deck_type` is set on local state ([GenerateGO.tsx:81](frontend/src/pages/GenerateGO.tsx#L81), [GeneratePG.tsx:65](frontend/src/pages/GeneratePG.tsx#L65)).
- For card decks, the user is **still asked** to pick tier + style at the CardImageStyle step. There is no read of any default tier from the existing deck (because we do not persist `deck.card_image_model`).

### Payload-level problems found

| # | finding | severity |
|---|---|---|
| **P1** | The frontend tier choice and the user-facing copy ("GPT Image-2 Card", "Standard Card", "Card Deck") imply **the visual style is per-card**, but visual style and tier appear *together* on one screen, mixing product lane and aesthetic. | **High** — UX |
| **P2** | The lane chosen at Step 2 ("Card Deck") is not the user's actual product. The real product (Standard vs Premium) is decided **two steps later**, after Words. | **High** — UX |
| **P3** | `CardImageStyleStep` always sets both `card_image_model` and `card_image_style`. There is no path that omits style. The backend tolerates a missing style (default "Photorealistic" in [card_worker.py:271](src/orchestration/card_worker.py#L271)), so this is a missed simplification. | Medium |
| **P4** | `GenerateGO` and `GeneratePG` re-implement payload composition independently. `GenerateGO` even re-derives `creative_direction`/`genre` differently (e.g. uses `customGenre` vs the reducer's own genre handling). Drift risk on any payload change. | **High** — maintainability |
| **P5** | When appending cards to an existing card deck, the wizard always re-asks for tier and visual style. We do not remember the deck's prior tier (we never stored it on the deck row). | Medium |
| **P6** | "GPT Image-2 Card" leaks the model name into the user's deck-tier vocabulary. Sir Robert wants this surfaced as **Premium Card**. | **High** — copy |
| **P7** | The dead `GenerateWizard.tsx` exists and silently rots. Touching `useWizardState` already costs us an extra search across two-and-a-half implementations. | Low |

> **No backend change required.** The wire format already supports the desired three-lane product split. All seven findings are frontend / copy concerns.

---

## 3. Desired Flow Map

The new top-level Step 2 is "Product Lane" with three tiles. After lane selection, words and (optional) per-lane controls follow.

### Step ordering for all three lanes

| step | Video & Music | Standard Card | Premium Card |
|---|---|---|---|
| 1 | Language | Language | Language |
| 2 | **Product Lane** → Video & Music | **Product Lane** → Standard Card | **Product Lane** → Premium Card |
| 3 | Words / Category | Words / Category | Words / Category |
| 4 | Vibe | (optional) Visual Style | (optional) Visual Style |
| 5 | Art Style | Confirm (Synthesis Ready) | Confirm (Synthesis Ready) |
| 6 | Niveau | — | — |
| 7 | Genre | — | — |
| 8 | Confirm | — | — |

### Quick Generate

- Pressed inside `WordsStep` after the user has typed at least one word.
- **Video:** submit immediately with `settings_override={}`, `art_style=null`, `movie_override=null`. (Already works.)
- **Standard Card:** submit immediately with `settings_override={card_image_model:"zturbo"}`. **No tier prompt** (lane already locked at step 2). **No mandatory visual style** (backend defaults to Photorealistic).
- **Premium Card:** submit immediately with `settings_override={card_image_model:"gpt_image_2"}`. Same defaults.

This eliminates the current "Quick Generate for cards still pushes you to a tier picker" trap.

### Step 2 product lane copy (proposal)

| tile | label | helper line | cost line |
|---|---|---|---|
| `video` | **Video & Music** | A music video for every word. | 10 credits / word |
| `card_standard` | **Standard Card** | Fast image card for daily review. | 1 credit / card |
| `card_premium` | **Premium Card** | Cinematic image card with stronger composition. | 5 credits / card |

"GPT Image-2" is **not** in user-facing copy. It may appear as a small tooltip or admin-only line.

### Why this is correct
- Visual style (Realistic / Editorial / Random) becomes a *style* concern that lives **inside** a card lane and never decides Standard vs Premium.
- The user always knows what they are buying before entering words.
- Quick Generate becomes truly quick for cards: words → submit.

---

## 4. Payload Requirements (per lane)

These are unchanged from what the backend already expects. The frontend just needs to derive them from the new `productLane` instead of from `deckType + cardImageModel` separately.

### Video & Music
```jsonc
deckPayload: { deck_type: "video", ... }
jobPayload: {
  ...,
  settings_override: { /* creative_direction?, genre?, lyric_mode? */ }
}
```
- ❌ Must NOT include `card_image_model`.
- ❌ Must NOT include `card_image_style`.

### Standard Card
```jsonc
deckPayload: { deck_type: "card", art_style: null, movie_override: null, ... }
jobPayload: {
  art_style: null, movie_override: null, ...,
  settings_override: {
    card_image_model: "zturbo",
    /* card_image_style: "Photorealistic" | "Editorial" | "Random"  -- optional */
  }
}
```

### Premium Card
```jsonc
deckPayload: { deck_type: "card", art_style: null, movie_override: null, ... }
jobPayload: {
  art_style: null, movie_override: null, ...,
  settings_override: {
    card_image_model: "gpt_image_2",
    /* card_image_style: "Photorealistic" | "Editorial" | "Random"  -- optional */
  }
}
```

### Frontend mapping (informational, not code)
```
productLane === "video"          → deck_type=video, no card fields
productLane === "card_standard"  → deck_type=card,  card_image_model=zturbo
productLane === "card_premium"   → deck_type=card,  card_image_model=gpt_image_2
```

### Does `submitGeneration.ts` need to change?
**No.** The function is already a transparent passthrough to the RPC. Both `useWizardState.buildPayload` and `GenerateGO`'s inline payload composer already produce the right shapes when fed the right state — they only need the new lane derivation upstream.

---

## 5. Cost Display Requirements

Frontend display (server-side pricing remains authoritative).

| lane | display cost | unit |
|---|---|---|
| Video & Music | 10 credits / word | per word |
| Standard Card | 1 credit / card | per card |
| Premium Card | 5 credits / card | per card |

`computeCreditCost` in [useWizardState.ts:179-189](frontend/src/components/generate/useWizardState.ts#L179-L189) already computes the right number; only its **inputs** change semantics. The constant table at [useWizardState.ts:173-177](frontend/src/components/generate/useWizardState.ts#L173-L177) is correct.

The Confirm screen should show the lane label (Video & Music / Standard Card / Premium Card) instead of the current `deckType === 'card' ? cardImageModel === 'gpt_image_2' ? 'GPT Image-2 Card' : 'Standard Card' : 'Video'` derivation in [ConfirmStep.tsx:17-21](frontend/src/components/generate/steps/ConfirmStep.tsx#L17-L21) and similar in [GenerateGO.tsx:694](frontend/src/pages/GenerateGO.tsx#L694) and [GeneratePG.tsx:809](frontend/src/pages/GeneratePG.tsx#L809).

---

## 6. Existing Deck Append Behavior

### Today
1. User clicks "Add Cards" on a deck (`/generate?deckId=...`).
2. Wizard loads the deck row, copies `target_language`, `art_style`, `movie_override`, `deck_type`.
3. Language step is replaced by a "locked language" panel.
4. **For card decks**, the wizard still asks for tier + visual style at `CardImageStyleStep`. The deck's prior tier is **not** read because nothing on `decks` records it (`card_image_model` lives on the *job*, not the deck).
5. **For video decks**, the wizard runs the full vibe / art / niveau / genre flow.

### Risks of the current behavior
- A user could append a Premium card to a deck whose prior cards were Standard, with no warning. The deck UI would then mix tiers visually. (No data-level problem — every word stores its own tier in `words.metadata` — but it is UX-confusing.)
- The user has no way to "default to whatever this deck used last time" because we do not persist the per-deck default.

### Recommended behavior for now (no DB migration)
- **Video decks:** unchanged. Skip language, run video flow.
- **Card decks:** the new Step 2 (Product Lane) should be **shown**, but pre-selected to whatever tier the deck **last used** if we can derive it cheaply, with a visible "this deck's last cards were Standard / Premium" note.
  - Cheap derivation option: read the most recent `generation_jobs.settings_override->>'card_image_model'` for that deck. (1 extra select; no schema change.)
  - If derivation fails or is omitted in V1, default the lane to the deck's existing tier-or-Standard with no auto-skip.
- The lane **must remain mutable** during append — a user who explicitly wants to add Premium cards to a Standard deck (or vice versa) must be allowed to.
- We should **not** silently switch the lane based on the current GPT tier toggle the user happened to have selected on a previous wizard run.

This keeps V1 safe and reversible. Persisting a `decks.default_card_image_model` (or similar) is a future enhancement — out of scope for this redesign.

---

## 7. Classic vs Glassy

| | Classic (`GeneratePG`) | Glassy (`GenerateGO`) |
|---|---|---|
| state model | `useWizardState` reducer | local `useState` + adapter for `WordsStep` |
| step shell | `pgStep` int, breadcrumb pills | `step` int, scroll-into-view sections |
| lane / deck-type tiles | `DeckTypeStep` (skin=classic) | `DeckTypeStep` (skin=glassy) |
| card tier + style | `CardImageStyleStep` (skin=classic) | `CardImageStyleStep` (skin=glassy) |
| review screen | `StepReview` (inline component in same file) | inline section near bottom of `GenerateGO.tsx` |
| live route | not currently routed | `/generate` |
| "Add cards" mode | supported | supported |

Both skins **must** stay in sync because:
- `Generate.tsx` re-exports `GeneratePG` (so any future routing flip can land in classic).
- The same `submit_generation` RPC + same backend pricing.

### Files that **must** change consistently for both skins
- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/pages/GeneratePG.tsx`
- `frontend/src/components/generate/useWizardState.ts` — add `productLane`
- `frontend/src/components/generate/steps/DeckTypeStep.tsx` — replaced by a `ProductLaneStep` (3 tiles)
- `frontend/src/components/generate/steps/CardImageStyleStep.tsx` — split: tier panel goes away; visual-style panel becomes its own optional step or inline section
- `frontend/src/components/generate/steps/ConfirmStep.tsx` — lane label
- (`frontend/src/components/generate/GenerateWizard.tsx` — the dead twin; either update to keep it parallel or delete in this same change)

### Recommendation
Refactor `useWizardState` to add `productLane: 'video' | 'card_standard' | 'card_premium' | null` as the **single source of truth**, and derive `deckType`/`cardImageModel` from it for payload composition. `GenerateGO` should also adopt the reducer (or at minimum a read-only mirror) so the two skins stop drifting. Whether to do that consolidation in V1 or as a follow-up is a scope call for Sir Robert.

---

## 8. Mobile Behavior

The lane choice moving from step 2 to step 2 (no positional change in the sequence) is a copy/UX rework, not a structural one — most mobile risks are limited:

1. **Three tiles instead of two.** On phones, `grid-cols-1 sm:grid-cols-2` becomes `grid-cols-1 sm:grid-cols-3` for ≥ sm and **stays single-column on mobile** (`<640px`). Mobile users will see three stacked cards instead of two, which is fine but increases scroll on a small viewport. Solution: keep the lane tiles compact (one short helper line, one cost line) — current `DeckTypeStep` already does this.
2. **GenerateGO scroll-into-view.** [GenerateGO.tsx:118-123](frontend/src/pages/GenerateGO.tsx#L118-L123) auto-scrolls each new section to center on `step` change. Adding a third tile does not change this. Removing the standalone "Choose card tier" step (because tier moves up to the lane step) **shortens the flow** for cards from 5 sections to 4 (plus optional style), which improves mobile.
3. **Glassy skin's "Choose card tier" panel** in `CardImageStyleStep` will go away. The remaining "Visual style" panel is short (3 tiles in 1×3) and already mobile-OK.
4. **Breadcrumb pills** in classic ([GeneratePG.tsx:341-398](frontend/src/pages/GeneratePG.tsx#L341-L398)) wrap on small screens. The card-branch label list shrinks from 5 to 4–5 entries depending on whether visual style remains a separate step. No new wrap-risk.

**Safeguards required for V1, no full mobile redesign:**
- Test the new lane step at 360px width (Pixel 5 / iPhone SE).
- Confirm orb tile heights match between Standard and Premium tiles in the glassy skin (Premium's longer copy must not blow out the row).
- Keep cost lines under ~24 chars to avoid two-line wraps on the smallest tiles.

---

## 9. Components to Change Later (file list for the implementation pass)

This is the file list for the future implementation PR — **not** for this investigation.

### Required
1. `frontend/src/components/generate/useWizardState.ts`
   - Add `productLane: 'video' | 'card_standard' | 'card_premium' | null`.
   - Set `productLane` in `SET_DECK_TYPE` for back-compat or replace `SET_DECK_TYPE` with `SET_PRODUCT_LANE`.
   - In `buildPayload`, derive `deck_type` and `card_image_model` from `productLane`.
2. `frontend/src/components/generate/steps/ProductLaneStep.tsx` **(new)**
   - Three tiles. Glassy + classic skins.
   - Replaces `DeckTypeStep` at the call sites.
3. `frontend/src/components/generate/steps/DeckTypeStep.tsx`
   - Either delete (preferred) or freeze and stop using.
4. `frontend/src/components/generate/steps/CardImageStyleStep.tsx`
   - Remove the "Choose card tier" panel entirely.
   - Keep the visual-style panel; consider renaming the file to `CardVisualStyleStep.tsx`.
   - Make visual style **optional** (skip-able / Auto-default).
5. `frontend/src/components/generate/steps/ConfirmStep.tsx`
   - Lane label derivation: Video & Music / Standard Card / Premium Card.
6. `frontend/src/pages/GenerateGO.tsx`
   - Replace step 2's `DeckTypeStep` with `ProductLaneStep`.
   - Remove the tier panel-handling in step 4.
   - Update breadcrumb / summary copy.
   - Adjust local `useState` shape (or migrate to `useWizardState`).
7. `frontend/src/pages/GeneratePG.tsx`
   - Same replacements as `GenerateGO`.
   - Update `BreadcrumbPills` step labels.
   - Update `StepReview` summary chip(s).
8. `frontend/src/components/generate/GenerateWizard.tsx`
   - Either delete (preferred — it is unrouted) or update in lockstep.

### Probably touched (copy / minor)
- Translation strings: `generate.deckType.video.label`, `generate.deckType.card.label`, `generate.cardImageStyle.*`, plus new `generate.productLane.*` keys (if i18n stays).
- `frontend/src/lib/languages.ts` — unaffected.
- `frontend/src/index.css` — unaffected (orb / glass classes already cover three tiles).

### Tests to add or update
- `frontend/scripts/test-phase1f0-credit-pricing.ts` — confirm lane→price mapping unchanged.
- `tests/test_gpt_premium_card_submit_generation_pricing.py` — already covers backend pricing; no change.
- New: a small RTL/component test that the three lanes produce the three documented payloads (`zturbo` / `gpt_image_2` / no card field).

---

## 10. Components NOT to Touch (explicit)

The following are **out of scope** for this redesign. Any change here is a separate spec.

| area | why off-limits |
|---|---|
| Backend provider routing (`cloud_engines/image_engine/*`) | Backend is already correct (smoke-passed). |
| GPT Image-2 prompt architecture (`gpt_card_prompts.py`, renderer profiles, layer 2 controls) | Hidden behind auto profile by design. |
| Renderer profile selector UI (`balanced_teaching` etc.) | Not exposed yet. |
| Pricing logic in `submit_generation` SQL | Authoritative; matches frontend display. |
| DB migrations | None needed for this redesign. |
| Video / music backend behavior | Untouched. |
| Standard / Z-Turbo backend behavior | Untouched. |
| `card_worker.py` settings consumption | Reads what we already send. |
| `image_scene` / `mnemonic` separation | Backend concern. |
| GPT metadata at `words.metadata.gpt_image_2_card` | Backend concern. |
| Typography / speech bubbles / text overlays | Future work; no UI yet. |

---

## Risks

1. **Two divergent generate pages** (`GeneratePG` + `GenerateGO`) means we will silently break the unrouted classic skin if we only patch glassy. Mitigation: change both in the same PR, or first consolidate `GenerateGO` onto `useWizardState`.
2. **Append-cards default tier** — if we read "last used model" from `generation_jobs`, a freshly-imported deck or one with no prior cards has no signal. Default to Standard explicitly and label it.
3. **Quick Generate semantics change** — today, Quick Generate for cards still routes through `CardImageStyleStep`. If implementation removes that detour, anyone who was relying on the implicit visual-style picker will lose it. Mitigation: keep visual style optional and accessible via a "Customize" button on the lane step or words step.
4. **Translation keys** — i18n has `generate.deckType.*` and `generate.cardImageStyle.*` but no `generate.productLane.*`. New keys must be added in **all** locale files at the same time, or fall back gracefully.
5. **Mobile tile-height drift** between three tiles with different copy lengths (Premium's helper is the longest). Visual QA needed at 360px.
6. **Dead code (`GenerateWizard.tsx`)** could be modified by an over-eager implementer who assumes it is live. Either delete or annotate clearly in the same PR.
7. **Existing-deck mode currently force-locks `deckType` from the deck row** (`SET_DECK_TYPE` at [GenerateWizard.tsx:48](frontend/src/components/generate/GenerateWizard.tsx#L48), [GenerateGO.tsx:81](frontend/src/pages/GenerateGO.tsx#L81), [GeneratePG.tsx:65](frontend/src/pages/GeneratePG.tsx#L65)). The new `productLane` must subscribe to that lock for video decks (cannot become a card lane for an existing video deck), but for card decks must remain user-mutable between Standard and Premium.

---

## Tests Needed (for the implementation PR, not now)

- Unit / RTL:
  - `productLane=video` → payload has no `card_image_model`.
  - `productLane=card_standard` → payload has `card_image_model: "zturbo"`.
  - `productLane=card_premium` → payload has `card_image_model: "gpt_image_2"`.
  - Quick Generate for cards: tier from lane, no detour through visual-style picker.
  - Append-cards mode: video deck → lane locked to Video; card deck → lane mutable Standard ↔ Premium.
- Integration / E2E (Playwright):
  - End-to-end: pick Premium → enter "Heimweh" → Quick Generate → see deck created with `deck_type=card` and the GPT pricing applied.
  - Existing card deck → Add Cards → Premium remains selectable.
- Regression:
  - Video lane (vibe → art → niveau → genre) untouched.
  - Pricing display matches RPC return (`credits_charged`, `credit_cost_per_word`).

---

## Summary for Sir Robert

| | |
|---|---|
| **Current flow problem** | "Card tier" (Standard vs Premium) is decided **after** Words on a screen that also picks visual style. The product lane the user is buying is hidden behind the generic word "Card Deck". |
| **Payload problems** | None at the wire level. `submit_generation` already accepts `deck_type` + `settings_override.card_image_model`. The fix is purely UX. |
| **Recommended new flow** | Step 1 Language → Step 2 **Product Lane** (Video & Music / Standard Card / Premium Card) → Step 3 Words → Step 4 (per-lane optional: Visual Style for cards, Vibe/Art/Niveau/Genre for video) → Confirm. |
| **Files to change later** | `useWizardState.ts`, `GenerateGO.tsx`, `GeneratePG.tsx`, new `ProductLaneStep.tsx`, simplified/renamed `CardImageStyleStep.tsx`, `ConfirmStep.tsx`, plus delete or freeze `GenerateWizard.tsx` and old `DeckTypeStep.tsx`. |
| **Top risks** | Two divergent pages drifting; append-mode tier default; mobile tile heights with three tiles; i18n key gap. |
| **Tests** | Three-lane payload mapping tests + Quick Generate detour removed + append-mode behavior preserved. |

Awaiting approval before implementation.
