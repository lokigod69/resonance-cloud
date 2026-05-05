# Frontend Polish — Glass & Loaders Implementation Report

**Status:** Implemented. Frontend-only.
**Author:** Claude Opus 4.7
**Date:** 2026-05-05
**Branch:** `main` (per project convention; no feature branch)
**Companion audit:** [FRONTEND_POLISH_GLASS_LOADERS_AUDIT.md](FRONTEND_POLISH_GLASS_LOADERS_AUDIT.md)

> **Scope guard:** zero touches to Supabase migrations, backend workers, generation/retry RPCs, provider APIs, Phase 1C auth/rate-limit work, DB/RLS/state-machine logic, `src/orchestration/**`, `src/cloud_engines/**`, or `frontend/api/**`. The working tree contains some unrelated backend changes from a parallel Layer 2 workstream — those are **not** committed by this pass.

---

## A. Status copy decisions

Translation keys updated in [frontend/src/lib/translations.ts](orchestrator/frontend/src/lib/translations.ts):

| Key | EN | DE | FR |
|---|---|---|---|
| `deckview.cardCreation` | `Image creation` | `Bilderstellung` | `Création d'image` |
| `deckview.cardFailure` | `Image failed` | `Bild fehlgeschlagen` | `Image échouée` |

No backend states / `current_stage` / status enums were touched. The conditional rendering in [DeckViewPG.tsx](orchestrator/frontend/src/pages/DeckViewPG.tsx) and [DeckView.tsx](orchestrator/frontend/src/pages/DeckView.tsx) was left intact — only the strings these keys map to changed.

---

## B. Loader strategy

### B.1 OrbSpinner — new component

[frontend/src/components/ui/OrbSpinner.tsx](orchestrator/frontend/src/components/ui/OrbSpinner.tsx)

```ts
interface OrbSpinnerProps {
  size?: number       // default 96; suitable for page loading
  className?: string  // applied to the outer container
  ariaLabel?: string  // default "Loading"; sets role=status + sr-only label
}
```

Rendering: a `motion.div` filled with the existing teal → violet → rose conic gradient (using the same `--pg-accent-*` CSS variables, with hex fallbacks `#0de2c3 / #8b5cf6 / #f43f5e`), wrapped over a blurred halo div for soft glow. Background is transparent — the orb sits cleanly on dark or glassy surfaces with no opaque box.

**Reduced-motion support:** uses framer-motion `useReducedMotion()`. When `prefers-reduced-motion: reduce`:
- the rotation animation is replaced by a slow opacity pulse (0.7 → 1 → 0.7 over 2.4s)
- the halo opacity drops from 0.4 to 0.25 to reduce visual intensity

**Accessibility:**
- `role="status"` and `aria-live="polite"`
- the `ariaLabel` doubles as an `sr-only` span for screen readers

### B.2 GenerationWheelLoader refactor

[frontend/src/components/ui/GenerationWheelLoader.tsx](orchestrator/frontend/src/components/ui/GenerationWheelLoader.tsx) was lightly refactored to **delegate orb rendering to `OrbSpinner`**, so the conic gradient lives in exactly one place. The label/sublabel slots and pulsing headline animation are preserved unchanged. `GenerateGO`, `GeneratePG`, and `DeckViewPG` continue to use `GenerationWheelLoader` and behave identically to before.

### B.3 ParticleSpinner page-level call sites replaced

| File | Before | After |
|---|---|---|
| [App.tsx:50,69,88](orchestrator/frontend/src/App.tsx) — Supabase init / auth fallback (×3) | `ParticleSpinner preset="spirograph" size={160}` | `OrbSpinner size={140} ariaLabel="Loading"` |
| [DashboardPG.tsx:238](orchestrator/frontend/src/pages/DashboardPG.tsx) | `ParticleSpinner preset="rose" size={140}` | `OrbSpinner size={140} ariaLabel={t('dashboard.loadingDecks')}` |
| [DecksPG.tsx:262](orchestrator/frontend/src/pages/DecksPG.tsx) | `ParticleSpinner preset="rose" size={140}` | `OrbSpinner size={140} ariaLabel="Loading decks"` |
| [DeckViewPG.tsx:369](orchestrator/frontend/src/pages/DeckViewPG.tsx) | `ParticleSpinner preset="spiral" size={140}` | `OrbSpinner size={140} ariaLabel={t('deckview.loadingDeck')}` |
| [StudyPG.tsx:32](orchestrator/frontend/src/pages/StudyPG.tsx) | `ParticleSpinner preset="heart" size={140}` | `OrbSpinner size={140} ariaLabel={t('study.loadingCards')}` |
| [AdminRoute.tsx:78](orchestrator/frontend/src/components/AdminRoute.tsx) | `ParticleSpinner preset="rose" size={120}` | `OrbSpinner size={120} ariaLabel="Loading admin"` |

### B.4 ParticleSpinner status

**Kept**, not deleted. Per the audit's recommendation and the implementation brief, `ParticleSpinner.tsx` still exists and is still imported by classic-skin pages (`Dashboard.tsx`, `Decks.tsx`, `DeckView.tsx`, `Study.tsx`, `StudyAudio.tsx`, `StudyFlashcard.tsx`) and an inline word-library spinner in `DashboardPG.tsx:301`. The classic skin remains user-selectable via the skin switcher, and replacing those would expand the surgical scope. ParticleSpinner is therefore intentionally retained, not deprecated, until a future pass can decide its fate.

### B.5 Inline loader cleanup

| File | Change |
|---|---|
| [DeckViewPG.tsx:740-748](orchestrator/frontend/src/pages/DeckViewPG.tsx) | Card thumbnail "queued/processing" placeholder now centres a small `OrbSpinner size={28}` above the status text (only when `word.status !== 'failed'`). Status text colour bumped from `text-white/35` → `text-white/55` for legibility on the gradient. |
| [DeckPickerSheet.tsx:110](orchestrator/frontend/src/components/deck/DeckPickerSheet.tsx) | Brightened dim sheet loader from `text-white/40` → `text-white/80`. Kept Lucide `Loader2` since it's a small functional sheet indicator. |
| [CategoryPicker.tsx:220](orchestrator/frontend/src/components/generate/steps/CategoryPicker.tsx) | Replaced central `<Loader2 h-6 w-6 animate-spin />` with `<OrbSpinner size={32} ariaLabel="Finding words" />`. |
| [SharePage.tsx:46](orchestrator/frontend/src/pages/SharePage.tsx) | Replaced one-off teal ring `<div border-2 border-teal-400 ... animate-spin />` with `<OrbSpinner size={96} />`. |
| [Speak.tsx:1305](orchestrator/frontend/src/pages/Speak.tsx) | Brightened mic-button processing spinner from `text-[var(--text-muted)]` → `text-[var(--text-secondary)]`. Kept Lucide `Loader2` because the spinner sits *inside* a circular button slot — replacing it would break the button geometry. |

Other Lucide button-internal spinners (Speak record / connect / DeckPickerSheet move-button / DeckView retry / etc.) were left as-is per the brief: small, functional, and embedded inside buttons with deliberate sizing.

---

## C. Glass / backdrop blur changes

### C.1 New utility classes

Added to [frontend/src/index.css](orchestrator/frontend/src/index.css):

```css
.glass-modal-backdrop {
  background: rgba(2, 6, 23, 0.55);
  backdrop-filter: blur(28px) saturate(1.35);
  -webkit-backdrop-filter: blur(28px) saturate(1.35);
}

.glass-overlay {
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(20px) saturate(1.35);
  -webkit-backdrop-filter: blur(20px) saturate(1.35);
}
```

These provide the "true-glass" full-screen layer that modal panels stack on top of (the two-layer pattern from the audit).

### C.2 Existing class adjustments

| Class | File | Change |
|---|---|---|
| `.glass` | [index.css:425](orchestrator/frontend/src/index.css) | Added `saturate(1.35)`; added `-webkit-backdrop-filter`. |
| `.glass-strong` | [index.css:435](orchestrator/frontend/src/index.css) | Bumped to `blur(32px) saturate(1.4)` with webkit twin. |
| `.pg-glass` | [index.css:518](orchestrator/frontend/src/index.css) | Bumped `blur(20px)` → `blur(24px) saturate(1.35)`. |
| `.classic-deck-card` | [index.css:331](orchestrator/frontend/src/index.css) | `blur(12px)` → `blur(20px) saturate(1.35)`; alpha 0.45 → 0.42. |
| `.speak-glass-card` | [index.css:670](orchestrator/frontend/src/index.css) | `blur(18px)` → `blur(24px) saturate(1.35)`; alpha 0.55 → 0.45 (base) and 0.44 → 0.42 (skin-glassy). |
| `.skin-glassy .glass` | [index.css:543](orchestrator/frontend/src/index.css) | Added `saturate(1.35)`; bumped `blur(20px)` → `blur(24px)`. |
| `.skin-glassy .glass-strong` | [index.css:553](orchestrator/frontend/src/index.css) | Added `saturate(1.4)`; bumped `blur(24px)` → `blur(28px)`. |

### C.3 Dialog overlay fix

[frontend/src/themes/glass-orb.css:18-22](orchestrator/frontend/src/themes/glass-orb.css):

```diff
.skin-glassy [data-slot="dialog-overlay"] {
-  background: color-mix(in srgb, var(--app-bg) 78%, transparent);
-  backdrop-filter: blur(28px) saturate(0.7);
-  -webkit-backdrop-filter: blur(28px) saturate(0.7);
+  background: color-mix(in srgb, var(--app-bg) 60%, transparent);
+  backdrop-filter: blur(28px) saturate(1.35);
+  -webkit-backdrop-filter: blur(28px) saturate(1.35);
}
```

The `saturate(0.7)` was the audit's "muddy / dead" finding — flipped to `saturate(1.35)` to match `theme-contract.css`. Background alpha lowered from 78% → 60% so the blur is actually visible.

### C.4 Modal / sheet / nav JSX class swaps

| File | Element | Before | After |
|---|---|---|---|
| [components/ui/dialog.tsx:42](orchestrator/frontend/src/components/ui/dialog.tsx) | DialogOverlay | `bg-black/70 backdrop-blur-md` | `bg-black/55 backdrop-blur-2xl saturate-[1.35]` |
| [components/dashboard/WordDetailModal.tsx:64](orchestrator/frontend/src/components/dashboard/WordDetailModal.tsx) | Modal backdrop | `bg-black/70 backdrop-blur-sm` | `bg-black/55 backdrop-blur-2xl saturate-[1.35]` |
| [components/deck/CardWordViewerModal.tsx:103](orchestrator/frontend/src/components/deck/CardWordViewerModal.tsx) | Modal outer | `gradient-bg` (solid) | `glass-modal-backdrop` (true two-layer glass: 28 px blur + 0.55 dark + saturate 1.35) |
| same file, lines 125 & 135 | nav arrows | `bg-black/50 ... backdrop-blur-sm` | `bg-black/40 ... backdrop-blur-md saturate-[1.35]`; hover `hover:bg-white/15` |
| [components/speak/SpeakHistoryPanel.tsx:259](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx) | Sliding panel | `bg-gray-950/95 backdrop-blur-xl` | `bg-gray-950/55 backdrop-blur-2xl saturate-[1.35]` |
| same file, line 263 | Inner header | `bg-gray-950/80 backdrop-blur-md` | `bg-gray-950/60 backdrop-blur-xl saturate-[1.35]` |
| [pages/DeckView.tsx:642](orchestrator/frontend/src/pages/DeckView.tsx) | Edit-mode bottom bar | `bg-black/80 backdrop-blur-xl` | `bg-black/55 backdrop-blur-2xl saturate-[1.35]` |

### C.5 Header / nav glass

[frontend/src/themes/theme-contract.css:122-124](orchestrator/frontend/src/themes/theme-contract.css):

```diff
.skin-glassy[class*="theme-"] {
-  --nav-bg: color-mix(in srgb, var(--app-bg) 85%, transparent);
+  --nav-bg: color-mix(in srgb, var(--app-bg) 62%, transparent);
}
```

The header (`.app-topnav`) already had `backdrop-filter: blur(36px) saturate(1.4)` for the glassy skin — what was missing was visible blur because the nav background alpha was 85 % opaque. Lowering it to 62 % lets the existing blur reveal scrolled content beneath. Classic-skin themes (warm-linen, slate, midnight, red-wine, rainy-day) keep their high-alpha values for legibility on those skins.

`PolishGlassLayout` and `AppLayout` JSX were not modified — the fix is entirely in CSS-variable land, so it survives skin changes without component re-rendering.

---

## D. Files changed

```
M  frontend/src/App.tsx
M  frontend/src/components/AdminRoute.tsx
M  frontend/src/components/dashboard/WordDetailModal.tsx
M  frontend/src/components/deck/CardWordViewerModal.tsx
M  frontend/src/components/deck/DeckPickerSheet.tsx
M  frontend/src/components/generate/steps/CategoryPicker.tsx
M  frontend/src/components/speak/SpeakHistoryPanel.tsx
M  frontend/src/components/ui/GenerationWheelLoader.tsx
M  frontend/src/components/ui/dialog.tsx
M  frontend/src/index.css
M  frontend/src/lib/translations.ts
M  frontend/src/pages/DashboardPG.tsx
M  frontend/src/pages/DeckView.tsx
M  frontend/src/pages/DeckViewPG.tsx
M  frontend/src/pages/DecksPG.tsx
M  frontend/src/pages/SharePage.tsx
M  frontend/src/pages/Speak.tsx
M  frontend/src/pages/StudyPG.tsx
M  frontend/src/themes/glass-orb.css
M  frontend/src/themes/theme-contract.css
A  frontend/src/components/ui/OrbSpinner.tsx          (new)
A  docs/FrontendPolish/FRONTEND_POLISH_GLASS_LOADERS_AUDIT.md          (audit, prior commit)
A  docs/FrontendPolish/FRONTEND_POLISH_GLASS_LOADERS_IMPLEMENTATION.md (this report)
```

---

## E. Known risks

1. **Heavy `backdrop-blur-2xl` (44 px) on full-screen modals** can be expensive on low-end Android. The pass uses 28 px blur on the persistent header and 24 px on `.pg-glass` cards; only the transient modal overlays use 44 px. Acceptable in practice but worth monitoring.
2. **Lower foreground alphas** (e.g. `bg-gray-950/55` on Speak history, `bg-black/55` on the deck-view edit bar) reduce text contrast slightly. Mitigation in place: text inside these surfaces sits on its own backgrounds (cards, buttons) that retain their solidity. If a particular text element looks weak, the right next move is a text-shadow on that element, not a revert of the alpha.
3. **`saturate(1.35)` boost on `.glass`** can over-pop colours on the warm-linen / classic light theme. Not yet observed in dev; add `[data-skin]` gating if visible regressions appear.
4. **`.classic-deck-card` blur bump** from 12 px → 20 px is more expensive on lots of cards. The classic decks page renders ~5–10 cards typically; should be fine.
5. **Reduced-motion path for OrbSpinner** uses opacity pulsing; verify on macOS Safari with the system "Reduce motion" toggle that the orb is still visible enough to read as a loading state.
6. **Dim Lucide spinners that were not touched** (button-internal Loader2 instances throughout Speak / DeckPickerSheet / DeckView retry button / GrokPicker / etc.) remain visually inconsistent with the orb. Out of scope per the brief; may surface in a future pass.
7. **Header alpha reduced from 0.85 → 0.62 on glassy skin only.** Classic-skin themes retain their 0.9–0.94 alpha. If a user toggles between skins, the header will visibly pop in opacity — acceptable trade-off; the glassy skin is intentionally glassier.

---

## F. Manual QA checklist

Run with the dev server on the **glassy** skin first, then repeat key flows on **classic**:

- [ ] **Dashboard:** the loading state (force a slow network) shows the rainbow orb at 140 px, not a particle curve.
- [ ] **Decks:** same loading visual; card thumbnails on a generating deck show the small 28 px orb above "Image creation" / "Queued" / "Image failed".
- [ ] **DeckView (PG):** during a fresh card generation, the existing `GenerationWheelLoader` orb still renders correctly (refactor sanity).
- [ ] **Generate (GO and PG):** orb and pulsing label still appear on submit (refactor sanity).
- [ ] **Study (PG):** loading state shows the rainbow orb.
- [ ] **Auth flow:** on first load of `/dashboard` while logged out → redirect via auth fallback shows the rainbow orb.
- [ ] **Admin route:** loading shows the rainbow orb at 120 px.
- [ ] **Card viewer modal (CardWordViewerModal):** open a card from a card deck — page content beneath should be visibly blurred and saturated (no longer a solid dark gradient). Nav arrows should show a soft frost on hover.
- [ ] **Word detail modal (Dashboard library word):** the backdrop strongly blurs the page; modal panel itself remains readable.
- [ ] **Dialog overlays (settings, redeem, profile, deck delete confirm):** overlay shows the page blurred and slightly saturated; not muddy / desaturated.
- [ ] **Speak history panel:** slide it in — the panel is now glassy, not opaque dark.
- [ ] **DeckView edit-mode bottom bar:** at `/deck/:id` (classic skin), select a word, the bottom bar should show a real backdrop blur instead of a near-solid dark slab.
- [ ] **Header (glassy skin):** scroll a long page — the header should show a perceptible blur of content scrolling underneath. (Was previously near-opaque.)
- [ ] **Reduced motion:** turn on the OS "Reduce motion" toggle, reload — orbs should pulse instead of spin; no nausea-inducing motion.
- [ ] **Mobile (≤ 360 px):** Pixel 5 viewport — the loaders are not cropped, the modals' blurs render, and text inside dimmer overlays remains readable.

Anything in the above list that doesn't behave should ping back here for a follow-up.

---

## G. Commands & checks

### Build & lint

Both run from `D:/CODING/ResonanceTEST/orchestrator/frontend`. Results captured in the implementation chat output.

| Command | Result |
|---|---|
| `npm run build` | reported in chat |
| `npm run lint` | reported in chat |
| `git diff --check` | reported in chat |

### Inventory greps

| Command | Expectation |
|---|---|
| `git grep -n "Image/card" -- frontend/src` | **0 matches** in source — only the audit doc may mention the old string. |
| `git grep -n "ParticleSpinner" -- frontend/src` | Remaining matches all in classic-skin pages and `ParticleSpinner.tsx` itself; **none** in PG page-level loaders or `App.tsx` / `AdminRoute.tsx`. |
| `git grep -n "saturate(0.7)" -- frontend/src frontend/src/themes` | **0 matches**. |
| `git grep -n "backdrop-blur-sm\|backdrop-blur-md" -- frontend/src` | Some remain in non-modal contexts (small chips / badges) — acceptable. The major modals have moved to `backdrop-blur-2xl`. |

### Forbidden-files check

`git diff --stat | grep -E "frontend/supabase/migrations|src/orchestration|src/cloud_engines|frontend/api|src/api"` — should return **nothing** as a result of *this* pass. Note: the working tree contains parallel Layer 2 backend changes from a separate workstream; those are **not part of this commit**.

---

## H. Next steps (out of scope for this pass)

1. Migrate the classic-skin pages (`Dashboard.tsx`, `Decks.tsx`, `DeckView.tsx`, `Study.tsx`, `StudyAudio.tsx`, `StudyFlashcard.tsx`) to OrbSpinner so the rainbow loader is universal regardless of skin.
2. Decide the fate of `ParticleSpinner.tsx` once classic is migrated (delete or repurpose for marketing pages).
3. A second pass on dim button-internal Lucide loaders (Speak / DeckPickerSheet / DeckView retry / GrokPicker / etc.) — could share a small `<MiniOrbSpinner>` variant.
4. Add an explicit Tailwind custom `backdropBlur.glass = 24px` token so future authors don't have to remember which Tailwind class corresponds to "the right glass blur".
5. Visual regression testing on the warm-linen / light theme to confirm `saturate(1.35)` on `.glass` doesn't over-saturate.
