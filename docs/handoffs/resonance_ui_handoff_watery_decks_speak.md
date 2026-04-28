# Resonance UI Handoff — Speak Premium Pass + Glassy Watery Decks

**Date:** 2026-04-26  
**Scope:** Frontend UI iteration for the Resonance app, primarily the Speak page and Glassy Decks page.  
**Current repo workflow:** Work directly on `main`; no feature branches for this phase.  
**Latest known Water Decks commit:** `3d981009d7ada98c902b42e0a6ed7d25f5814f38` — `fix(decks): balance watery carousel slot spacing`

---

## 1. Executive summary

We completed two major UI efforts:

1. **Speak page premium selection pass**  
   The Speak entry/picker experience was upgraded from a simple flat selector into a more premium glassy selection flow. The main scope included the language picker, provider toggle, Grok voice/mode/level flow, and visual compatibility for Vox/Gemini.

2. **Glassy Decks Watery view**  
   A new **Water** view was added to Glassy Decks as the most visually ambitious deck-browsing mode. It started as a boxed prototype and evolved into a page-native, full-bleed carousel with physical card motion, scrubber, arrows, mobile simplifications, and cumulative card spacing to prevent overlap.

The Water view is now considered acceptable for this phase. Remaining imperfections are intentionally deferred to later mobile/global layout optimization, not part of the current carousel design loop.

---

## 2. Product/design decisions made

### Speak

- Do **not** create a new skin just for Speak.
- Upgrade Speak as a page-level premium pass that works in both Classic and Glassy.
- Preserve all Grok/Vox/Gemini behavior and backend/session logic.
- Keep provider state owned by `Speak.tsx`.
- Grok defaults should be real state, not visual-only:
  - voice: `eve`
  - category: `free_chat`
- Grok flow became sequential:
  - Voice → Mode → Level → Start
- Use SVG/CSS/Lucide-style emblems before generating image assets.

### Decks / Water

- Do **not** create a third `watery` skin yet.
- Add Water as a Glassy `DecksPG` view mode first.
- Prove the design with DOM/CSS/Framer before considering WebGL/Canvas/video.
- Water should feel page-native, not like a boxed widget.
- Water view became the default Glassy Decks view.
- View order target:
  - Water / Stack / Grid / Orbs
  - If current UI still shows Water second, use the quick reorder prompt in section 12.
- Do not touch backend, auth, Supabase queries, routing, or other pages for these visual passes.

---

## 3. Main files involved

### Speak pass

Likely touched during the Speak work:

- `frontend/src/pages/Speak.tsx`
- `frontend/src/components/speak/GrokPicker.tsx`
- `frontend/src/components/speak/ProviderToggle.tsx`
- `frontend/src/components/speak/VoiceTutorPicker.tsx`
- `frontend/src/components/speak/CharacterGrid.tsx`
- `frontend/src/components/speak/GeminiModeVoicePicker.tsx`
- `frontend/src/index.css`

### Water Decks pass

Known touched files:

- `frontend/src/pages/DecksPG.tsx`
- `frontend/src/themes/glass-orb.css`
- `frontend/src/pages/decksWaterMotion.ts`
- `frontend/scripts/check-water-motion.ts`

Do **not** commit unrelated files or temporary QA screenshots. Several coding-agent runs reported untracked QA files such as `frontend/water-*.png`; those should stay uncommitted or be cleaned later.

---

## 4. Speak page final state

### Implemented

- Premium dark/glassy selection shell.
- Language selection visual upgrade.
- Provider toggle redesigned as segmented `GROK / VOX / GEM` control.
- Grok picker rebuilt with:
  - voice cards
  - mode cards
  - level cards
  - animated/polished emblems
  - 3D-style Start button
- Real default Grok selection:
  - Eve voice
  - Free Chat mode
- Level selection state made more visible.
- Vox and Gemini received a minimal visual compatibility pass.

### Known Speak follow-ups

- If new visual issues appear on mobile, handle in a separate Speak/mobile polish pass.
- Roleplay mode may still retain older visual language unless it was explicitly upgraded later.
- Generated tiny WebP mode artwork remains optional future polish; current vector/icon solution is sufficient for now.

---

## 5. Water Decks timeline

The Water view went through many iterations. The important milestones:

### Prototype

- Added `viewMode: 'water'` to `DecksPG.tsx`.
- Rendered a five-card carousel with center card and angled side cards.
- Used DOM/CSS/Framer only.
- Initially lived inside a visible black stage/container.

### Debox / page-native phase

- Removed the boxed-widget look.
- Made Water feel like the page background rather than a panel.
- Header remained above the full-bleed water area.

### Physical drag / scrubber phase

- Added draggable carousel motion.
- Added scrubber/range control for fast deck browsing.
- Moved arrows near the scrubber.
- Removed useless dot pagination.

### Continuous carousel model

Important architecture was introduced:

```ts
carouselPosition = useMotionValue(activeIndex)
virtualOffset = index - carouselPosition
```

Cards derive position/scale/rotation/opacity from `virtualOffset`. This replaced static active-card swapping and is the foundation of the current motion model.

### Overlap/bleed fixes

Several passes addressed overlap and transparency bleed:

- **V9:** replaced root opacity fade with internal dim overlay.
- **V10:** added nonlinear crossover spread via `getWaterCardX()`.
- **V11:** introduced overlap-aware spacing based on card width and scale.
- **V12:** switched to cumulative slot spacing so every adjacent lane is consistently separated.

---

## 6. Current Water Decks mechanics

### Critical helpers

Current Water math lives in:

```txt
frontend/src/pages/decksWaterMotion.ts
```

Key helpers:

- `getWaterCardScale(distance, isMobile)`
- `getWaterCardX(offset, deckSpacing, isMobile, cardWidth)`
- `getWaterCardRootOpacity(distance)`
- `getWaterCardDim(distance)`
- `getWaterCardZIndex(offset)`
- `getWaterRailClickTargetIndex(...)`

### Current spacing model

Latest reported V12 behavior:

- `getWaterCardX()` uses cumulative slot spacing.
- Fractional interpolation between slots is used.
- Adjacent overlap was measured as `0px` in mock/browser QA.
- `deckSpacing` is kept for compatibility in `getWaterCardX()` but ignored there; it is still used elsewhere for drag/rail behavior.
- Chosen gaps:
  - desktop: `8px`
  - mobile: `5px`

### Current known design tradeoff

The carousel now avoids overlap, but the cards may feel slightly too far apart. This is acceptable for now. Do not reopen the design loop unless the product owner explicitly wants tighter-but-safe spacing.

---

## 7. Current Water Decks status

### Accepted for now

- Water view is visually impressive enough to keep.
- Dragging and scrubber motion are smooth enough.
- Overlap is controlled.
- Water is default in Glassy Decks.
- The view is page-native rather than boxed.
- Mobile is acceptable enough for this phase, though not perfect.

### Known issues intentionally deferred

- On mobile, page scrolling may still exist even when Water itself does not need vertical scrolling.
- Some image loading may be delayed if the user scrubs very fast across many decks.
- Card spacing may feel a bit wide after V12.
- Orbs view still needs a future design pass.
- DeckView has not been converted to Water style.
- The Water/Stack/Grid/Orbs toggle order may need one final reorder depending on current UI state.

---

## 8. Validation commands used repeatedly

```bash
cd frontend
npx tsx scripts/check-water-motion.ts
npx tsc --noEmit
npm run build
```

Expected warnings:

- Vite may still emit existing dynamic import/chunk-size warnings related to Supabase. These were repeatedly reported as pre-existing and not caused by Water Decks.

---

## 9. Manual QA checklist for future changes

### Water desktop

- Water loads as default in Glassy Decks.
- Header looks correct.
- Cards do not overlap at rest or during slow drag.
- Dragging physically moves cards between slots.
- Scrubber moves through all decks.
- Side card click focuses side deck.
- Center card click opens deck.
- Arrows work and are not over card artwork.
- No weird glow/reflection artefacts on card faces.
- No empty vertical scroll just to reveal black space.

### Water mobile

- No black image flash.
- Dragging works from card artwork area.
- No giant-card bug.
- No obvious overlap.
- Scrubber usable.
- No horizontal overflow.
- Some vertical page scroll may still exist; treat as future mobile layout optimization.

### Other Decks modes

- Stack still works.
- Grid still works.
- Orbs still works.
- Header/view toggle persists across modes.

---

## 10. Important “do not regress” rules

- Do not translate the whole rail as the primary carousel mechanic.
- Do not swap active cards without physical interpolation.
- Do not use root opacity to dim visible cards; use internal dim overlay.
- Do not restore reflections/glows that produce card-face artefacts.
- Do not make far cards tiny slivers again.
- Do not re-add dot pagination for many decks.
- Do not add WebGL/Canvas/video unless starting a new deliberate phase.
- Do not commit unrelated backend/image/music/admin changes while polishing Decks UI.

---

## 11. Latest relevant commit chain

Approximate important Water commits from the session:

- `923baf6241b258ed834f6e5ae1b2ba3a2f791691` — first Watery Decks prototype
- `6b6735982e51d614e772aad1b4b4498d9441178c` — Phase 2 polish
- `afa2eeb014e637942389f0022ad2ca795154349f` — deboxed page integration
- `856985c5df3777b5bac0d1610c90e4adc44795c3` — interaction polish
- `6172cbdd3d8914b1d7413ef2a4e38b482bd72a40` — refined watery/glassy interactions
- `da02d381cc4e3cd3f55161d21a4f943bbe213065` — stabilized browsing
- `b86af3175efdae9be3005ca5a50f7c80e4068d0d` — mobile/layout optimization
- `90ffd3b3d81259710eedc91143fdc64ddf157d9f` — convergence polish
- `aef4a5b81c95ae75b147f21d10f28b24278cee6c` — V9 overlap bleed prevention
- `2396b58aa30d3ba155dc49771d58bc5fb2e501e7` — V10 crossover spread
- `67e0209dfbb63a064dee82fda2e5d0dd232601fc` — V11 separation
- `3d981009d7ada98c902b42e0a6ed7d25f5814f38` — V12 cumulative slot spacing

Last known accepted Water state is V12.

---

## 12. Optional final quick fix: view toggle order

If the view toggle still shows Water second, use this small prompt:

```md
Implement one final quick Decks view-order fix directly on main.

Goal:
In the Glassy Decks view-mode toggle, make Water the first option.

Desired order:
1. Water
2. Stack
3. Grid
4. Orbs

Scope:
- Frontend only.
- Work directly on main.
- Do not alter Water carousel motion, spacing, CSS, card transforms, or layout.
- Do not change Stack/Grid/Orbs behavior.
- Do not commit unrelated modified/untracked files.

Likely file:
- frontend/src/pages/DecksPG.tsx

Implementation:
Find the view-mode switcher options array in DecksPG.tsx and reorder it to:

[
  { mode: 'water' as ViewMode, icon: Waves, label: 'Water view' },
  { mode: 'stack' as ViewMode, icon: Layers, label: t('dashboard.viewStack') },
  { mode: 'grid' as ViewMode, icon: Grid3X3, label: t('dashboard.viewGrid') },
  { mode: 'orbs' as ViewMode, icon: Circle, label: t('dashboard.viewOrbs') },
]

Keep persisted user-choice behavior if present.

Validation:
cd frontend
npx tsc --noEmit
npm run build

Commit:
fix(decks): put watery view first

Push directly to main.
```

---

## 13. Future backlog

### Water / Decks

- Tighten card spacing slightly while keeping no-overlap guarantee.
- Optimize mobile page scrolling/no-empty-bottom behavior across Glassy pages.
- Add better image preloading/caching if scrubber navigation reveals delayed thumbnails.
- Rework Orbs as a polished independent mode.
- Consider Water-style DeckView later.
- Consider Canvas/WebGL caustics only if a future dedicated Water skin is approved.

### Speak

- Audit mobile after real testing.
- Upgrade roleplay branch if it still looks older than free chat/Grok.
- Optional: replace vector mode icons with generated small WebP mode art.

### App-wide

- Decide later whether Water becomes a full third skin.
- If full Water skin happens, it must touch Dashboard, Decks, DeckView, Study, Generate, Music, Speak, Profile/settings, empty states, loading states, and mobile navigation.

---

## 14. Recommended close condition

The Water Decks thread can be closed now if:

- Water looks acceptable on desktop.
- Water is usable on mobile.
- No card overlap is obvious.
- The product owner accepts the current wider spacing tradeoff.
- Any remaining mobile scroll/spacing concerns are treated as a separate mobile layout pass.

Current product-owner decision: close this thread and continue later only if a concrete mobile/global-layout issue appears.
