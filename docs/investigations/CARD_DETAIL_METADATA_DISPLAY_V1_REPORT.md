# Card Detail Metadata Display V1 — Implementation Report

**Date:** 2026-05-05
**Author:** Claude (Opus 4.7)
**Branch:** `main`
**Companion work:** [GENERATION_WIZARD_LANE_REDESIGN_IMPLEMENTATION_REPORT.md](GENERATION_WIZARD_LANE_REDESIGN_IMPLEMENTATION_REPORT.md)

---

## 1. Does the backend currently produce `usage_example`?

**Yes — and in three coexisting locations** for any given word row, depending on which pipeline stages the row passed through.

### Authoritative write-points (verified by reading source, not by sampling rows)

1. **Top-level `words.example` and `words.example_gloss`** (string columns)
   - Written by [src/orchestration/feeder.py:704-705](../../src/orchestration/feeder.py#L704) during enrichment for **every word**:
     ```python
     "example": e.get("example", "") or "",
     "example_gloss": e.get("example_gloss", "") or "",
     ```
   - These are the legacy single-line columns. They store the same content the LLM produced under the `example` / `example_gloss` keys.

2. **`words.metadata.visual_card_plan.usage_example`** (object `{ target, l1 }`)
   - Written by [src/orchestration/feeder.py:677](../../src/orchestration/feeder.py#L677) alongside the top-level columns:
     ```python
     "usage_example": e.get("usage_example"),
     ```
   - The enrichment prompt at [src/services/enrichment.py:128](../../src/services/enrichment.py#L128) explicitly requires the LLM to return `usage_example: {target, l1}`.
   - This is the **canonical** card-pipeline shape — written for both Standard and Premium cards.

3. **`words.metadata.gpt_image_2_card.usage_example`** (object `{ target, l1 }`)
   - Written by [card_worker.py:417](../../src/orchestration/card_worker.py#L417) **only for Premium cards** after the GPT Image-2 render, via [gpt_card_prompts.build_gpt_image_2_card_metadata](../../cloud_engines/image_engine/gpt_card_prompts.py#L202-L257).
   - This blob is a complete render-time snapshot: `image_scene`, `card_scene_displayed`, `mnemonic`, `displayed_mnemonic`, `mnemonic_confidence`, `etymology`, `usage_example`, `composition`, `treatment`, `creative_mode`, `text_embedding_mode`, `layer2_candidate_text_mode`, `single_image_teachable`, `dominant_emotional_reading`, `register_note`, `rationale_summary`, `final_provider_prompt_sha256`, `prompt_version`, `renderer_profile`, `renderer_profile_source`, `answer_visibility`.
   - Premium cards also have `words.mnemonic` overwritten with the post-render `displayed_mnemonic` ([card_worker.py:419](../../src/orchestration/card_worker.py#L419)).

### Why the resolver tries all three

Older rows (pre-`visual_card_plan` rollout) only have the legacy strings.
Mid-history rows have the legacy strings **and** `visual_card_plan` (Standard cards still produced today fall here).
Premium cards have all three plus `gpt_image_2_card`.
The user-facing UI must surface a usage example whenever any of them is non-empty.

I did **not** sample real rows in this run because the implementer doesn't have a service-role Supabase key in this environment. The write paths above are authoritative — they are the only places anything writes into these fields. The new helper is exercised against synthetic rows shaped after each path (see § 8).

---

## 2. Where is `usage_example` stored in real / current rows?

| pipeline stage | field path | shape | scope |
|---|---|---|---|
| Enrichment (every word) | `words.example` | `string` (target language) | All cards + video |
| Enrichment (every word) | `words.example_gloss` | `string` (base language) | All cards + video |
| Enrichment (every word) | `words.metadata.visual_card_plan.usage_example` | `{ target: string, l1: string }` | All cards (Standard + Premium) |
| Card render (Premium only) | `words.metadata.gpt_image_2_card.usage_example` | `{ target: string, l1: string }` | Premium cards only |

**Resolver priority** (chosen by [resolveCardLearningMetadata](../../frontend/src/lib/wordDisplayMetadata.ts)):
`gpt_image_2_card` → `visual_card_plan` → legacy `example`/`example_gloss` pair → `undefined`. The first non-empty pair wins. An empty pair (`{target:"", l1:""}`) is treated as "not present" so it doesn't render an empty section.

---

## 3. Which fields are now shown in normal card detail?

The user-facing card detail panel (`WordInfoPanel` in the modal opened from `DeckView`, and the inline collapsible block in `DeckViewPG`'s carousel) now shows, when available:

| field | source priority | rendering |
|---|---|---|
| **Mnemonic** | top-level `words.mnemonic` (which Premium overwrites with `displayed_mnemonic`) → `gpt_image_2_card.displayed_mnemonic` → `gpt_image_2_card.mnemonic` → `visual_card_plan.mnemonic` → `bridge_mnemonic` | small italic line under the word + translation |
| **Usage example** | `gpt_image_2_card.usage_example` → `visual_card_plan.usage_example` → legacy `example`/`example_gloss` pair | "In a sentence" group: target sentence + base translation, both lines |
| **Etymology** | top-level `words.etymology` → `gpt_image_2_card.etymology` → `visual_card_plan.etymology` | one row, label + value |
| **Part of Speech** | top-level `words.pos` (with optional `article` appended) | one row |
| **Star rating** | unchanged — still present, not made more prominent | inline below mnemonic |

Existing video-only fields (`creative_direction`, `art_style`, `music_caption`) continue to render in the same expandable section when the metadata blob carries them.

**Important UX rules enforced by the helper**:
- A field with a null / empty / whitespace-only value is **never** rendered, so missing data leaves no empty rows.
- A `usage_example` whose `{target, l1}` are both empty strings (the backend's pre-fill for failed enrichments) is **not** treated as present.
- The card type ("Standard" vs "Premium") is **not** shown anywhere in the user-facing card detail — both lanes share the same learning surface.

---

## 4. Which fields are admin/debug-only?

The admin `WordDetailPanel` (used by `/admin/observability/word/...` and the admin Content browser) now exposes two new collapsible blocks alongside the existing per-stage Generation Metadata sections:

### Visual Card Plan (`metadata.visual_card_plan`) — written for every card
- Image Scene
- Card Scene Displayed
- Composition
- Treatment
- Creative Mode
- Text Embedding Mode
- Renderer Profile
- Renderer Profile Source
- Answer Visibility
- Dominant Emotional Reading
- Single Image Teachable (boolean)
- Register Note
- Rationale Summary

### GPT Image-2 Card (`metadata.gpt_image_2_card`) — Premium cards only
- Prompt Version
- Final Provider Prompt SHA-256
- Layer 2 Candidate (text mode) (boolean)
- Card Image Model

### Resolved Usage Example
A small section showing the *exact* `target` / `base` strings the user-facing UI is currently surfacing (the resolver's output). This makes it easy to confirm the resolver is picking the right source.

The pre-existing **Production Brief Fields** ("GPT Enrichment") section was extended with: Bridge mnemonic, Example (target), Example (gloss). The pre-existing **Raw Metadata** JSON viewer is unchanged.

**Deliberately not exposed**, even in admin (per spec):
- Full final provider prompt body (only the SHA-256 is shown).
- Provider response body.
- Debug routing info.
- A user-facing card type badge.

---

## 5. Which metadata fields are missing or unreliable?

Based on a code reading of the write paths (no DB sampling done in this run):

- **`words.metadata.visual_card_plan.mnemonic_confidence`** is written when the LLM emits it, but the empty-enrichment fallback at [enrichment.py:289](../../src/services/enrichment.py#L289) sets `mnemonic: None, mnemonic_confidence: None`. So a card whose enrichment failed will have a present `visual_card_plan` blob with null confidence — which is correct, just not useful for display.
- **`words.metadata.gpt_image_2_card.displayed_mnemonic`** is set to `None` when `mnemonic_confidence` is absent (see [gpt_card_prompts.py:223-224](../../cloud_engines/image_engine/gpt_card_prompts.py#L223-L224)). Premium cards generated for words whose mnemonic was deemed "filler" will therefore have no displayed mnemonic — by design.
- **Older rows pre-`visual_card_plan` rollout** only have the legacy `example` / `example_gloss` strings. The resolver covers them.
- **`bridge_mnemonic`** is written at the top level but is not currently surfaced to the user (only admin). Sir Robert may want to expose it as a secondary hook in a future polish pass.
- **`composition` / `treatment`** in `visual_card_plan` may differ from `composition_hint` / `treatment_hint` (the latter are the LLM's *intent*, the former are the chosen render plan). The resolver returns both via `adminDebug` so admins can compare them.

What we do **not** know without sampling:
- Whether real rows have non-empty `usage_example` strings consistently. The enrichment prompt requires it, but the LLM can occasionally short-circuit and emit empty strings; the helper handles that gracefully.

---

## 6. What should be improved later in backend enrichment prompts?

Out of scope for this V1 (no backend changes), but worth noting:

1. **Validate `usage_example` non-emptiness at enrichment time.** Today the empty-fallback writes `{target:"", l1:""}` and the orchestration accepts it. A small server-side check that re-prompts when the example is empty would eliminate the only path that currently produces a missing usage example.
2. **De-duplicate the legacy `example`/`example_gloss` columns.** They duplicate `usage_example.{target,l1}` on every row. Once the frontend stops reading the legacy columns (they are still preserved as fallback for rows older than the `visual_card_plan` rollout), backfill + drop is safe — but that is a migration, deliberately not in scope here.
3. **`bridge_mnemonic` vs `mnemonic`** — the prompt asks for both. Today only `mnemonic` is shown. Consider whether the bridge variant should be the user-facing default for words where mnemonic_confidence is "decorative".
4. **Confidence-aware rendering.** With `mnemonic_confidence` available (essential / helpful / decorative), the user-facing UI could hide "decorative" mnemonics by default. Not done in V1 because it's a behavior change rather than a polish.

---

## 7. Files changed

### Created
- [frontend/src/lib/wordDisplayMetadata.ts](../../frontend/src/lib/wordDisplayMetadata.ts) — pure resolver `resolveCardLearningMetadata(word)` returning `{ mnemonic?, etymology?, partOfSpeech?, article?, usageExample?, imageScene?, cardSceneDisplayed?, adminDebug }`. No I/O, no React, exported helpers `WordLike`, `UsageExample`, `CardLearningMetadata`, `AdminDebugMetadata`.
- [frontend/scripts/test-word-display-metadata.ts](../../frontend/scripts/test-word-display-metadata.ts) — 46 assertions covering empty / null / undefined input, top-level only (legacy), `visual_card_plan` only, `gpt_image_2_card` Premium, missing usage example, missing mnemonic, missing etymology, malformed metadata, only-target, only-base.
- [docs/investigations/CARD_DETAIL_METADATA_DISPLAY_V1_REPORT.md](CARD_DETAIL_METADATA_DISPLAY_V1_REPORT.md) — this file.

### Modified
- [frontend/src/components/WordInfoPanel.tsx](../../frontend/src/components/WordInfoPanel.tsx) — uses `resolveCardLearningMetadata`. New "In a sentence" section before etymology / POS. Star rating preserved as-is. No card-type badge.
- [frontend/src/components/deck/CardWordViewerModal.tsx](../../frontend/src/components/deck/CardWordViewerModal.tsx) — `CardViewerWord` type widened to carry the optional columns (`example`, `example_gloss`, `bridge_mnemonic`, `dominant_emotional_reading`, `composition_hint`, `treatment_hint`, `card_image_model`) so the resolver receives them. Supabase query was already `select('*')`, no DB change needed.
- [frontend/src/pages/DeckViewPG.tsx](../../frontend/src/pages/DeckViewPG.tsx) — `Word` type widened similarly. Inline mnemonic line and the expandable info block now go through the resolver. Usage example renders in the same collapsible block above etymology / POS.
- [frontend/src/components/admin/WordDetailPanel.tsx](../../frontend/src/components/admin/WordDetailPanel.tsx) — `WordRecord` widened with `bridge_mnemonic` / `example` / `example_gloss`. Two new collapsible admin sections: "Visual Card Plan" and "GPT Image-2 Card", populated from `adminDebug.fields`. New "Resolved usage example" section showing exactly what the user UI surfaces. Production Brief Fields list extended with bridge mnemonic + legacy example columns.
- [frontend/src/pages/admin/Content.tsx](../../frontend/src/pages/admin/Content.tsx) — `WordRecord` widened to keep the type compatible with `WordDetailPanel`'s wider record. Supabase query already used `select('*')`.
- [frontend/src/lib/translations.ts](../../frontend/src/lib/translations.ts) — added `deckview.usageExample` for en ("In a sentence"), de ("Im Satz"), fr ("En contexte").
- [frontend/package.json](../../frontend/package.json) — `test:word-metadata` script.

### Intentionally NOT changed
- All backend code: `cloud_engines/image_engine/*`, `card_worker.py`, `feeder.py`, `enrichment.py`, `gpt_card_prompts.py`.
- The `submit_generation` RPC and pricing.
- Migrations.
- GPT Image-2 prompt architecture, renderer profiles, Layer 2 controls.
- Star rating behaviour.
- Video / music card detail (resolver passes `creative_direction` / `art_style` / `music_caption` through unchanged from existing video metadata blobs).
- `DeckView.tsx` itself — it already delegates the card detail panel to `WordInfoPanel` via `CardWordViewerModal`.

---

## 8. Tests / checks run

| check | command | result |
|---|---|---|
| Word metadata resolver (46 assertions) | `npm run test:word-metadata` | ✅ 46 passed, 0 failed |
| Lane → payload regression (40 assertions, from prior commit) | `npm run test:lane-payload` | ✅ 40 passed, 0 failed |
| TypeScript / Vite production build | `npm run build` | ✅ build succeeded, no TS errors |
| ESLint on changed files | `npx eslint src/lib/wordDisplayMetadata.ts src/components/WordInfoPanel.tsx src/components/deck/CardWordViewerModal.tsx src/components/admin/WordDetailPanel.tsx src/pages/DeckViewPG.tsx src/pages/admin/Content.tsx scripts/test-word-display-metadata.ts` | ✅ exit 0 |
| `git diff --check` | run pre-commit | clean |

The new resolver test specifically covers Sir Robert's required scenarios: `gpt_image_2_card.usage_example` object, `visual_card_plan.usage_example` object, legacy `words.example` string, missing usage example, missing mnemonic, missing etymology — plus a few extras (malformed metadata, only-target / only-base sides, post-render mnemonic rewrite preference).

---

## 9. Manual smoke instructions

These are short browser checks Sir Robert can run after pulling. Server-side smoke is unaffected (no backend change).

1. **Premium Card detail (DeckViewPG, the carousel skin)**
   - Open a generated Premium Card deck on `/deck/<id>`.
   - Open the carousel for any card with a known mnemonic (e.g. *fragrance* / *ebullient* / *Heimweh* / *coup de foudre*).
   - **Expect:** mnemonic line under the word + translation. Below it, the rating row. Tap the chevron to expand: see "In a sentence" with target + base translation, then etymology, then part of speech.
   - **Expect:** missing fields collapse cleanly — no empty rows.

2. **Premium Card detail (CardWordViewerModal, the grid skin)**
   - From a deck whose route renders the grid view (`DeckView.tsx`), tap a card to open the modal. Tap the (i) icon.
   - **Expect:** same layout as above ("In a sentence" → etymology → POS), polished and minimal.

3. **Standard Card behaviour**
   - Open a deck whose cards are Standard (`zturbo`).
   - **Expect:** identical learning info layout to Premium. **No card type badge anywhere.** Mnemonic + usage example pulled from `visual_card_plan` rather than `gpt_image_2_card`. Etymology and POS still present.

4. **Cards without a mnemonic / etymology / usage example**
   - Some words (function words, discourse markers) deliberately have no mnemonic per the enrichment prompt. Open one.
   - **Expect:** the mnemonic line disappears entirely, the expandable shows only the rows that have data.

5. **Admin WordDetailPanel**
   - From `/admin/content`, open any Premium card.
   - **Expect:** the new "Visual Card Plan" and "GPT Image-2 Card" collapsible sections, each showing renderer profile, composition, treatment, creative mode, text embedding mode, prompt version, final provider prompt SHA-256, etc. The "Resolved usage example" section shows the exact text rendered to the user.
   - For a Standard card: the "Visual Card Plan" section is present, the "GPT Image-2 Card" section is hidden.

6. **Video deck regression**
   - Open a video deck card detail.
   - **Expect:** mnemonic / etymology / POS still render as before. The video-specific rows (Creative Direction, Art Style, Music) still render. No new sections clutter the layout.

---

## 10. Risks remaining

1. **No live row sampling.** The resolver's behaviour is verified against synthetic rows derived from the write-path source code. If the LLM has produced a shape we did not anticipate, it will either fall through to a later candidate or be ignored — never crash. A follow-up quick browser pass on a real Premium card deck should confirm.
2. **i18n for the new key (`deckview.usageExample`)** uses literal phrasing in en/de/fr; consider a copy review if the product surface is shown in those locales.
3. **Older rows without `visual_card_plan`** still rely on the legacy `example`/`example_gloss` columns. The resolver covers them, but if those columns were ever wiped on legacy rows, the example will simply be hidden — graceful degradation.
4. **Admin WordRecord type drift.** I widened the type in two locations (`WordDetailPanel.tsx` and `admin/Content.tsx`). If any other admin surface declares its own narrower `WordRecord`, it will continue to compile but may not light up the new fields — follow-up pass to grep `WordRecord` across admin if Sir Robert sees gaps.
