# Frontend Polish — Glass & Loaders Audit

**Status:** Investigation only. No behavioural code changes proposed yet.
**Author:** Claude Opus 4.7
**Date:** 2026-05-05
**Branch:** `main` (working tree contains only previously-modified `frontend/src/components/settings/fieldConfigs.ts` + a test; no audit-related edits)
**Scope:** Resonance frontend at [orchestrator/frontend/src/](orchestrator/frontend/src/). Compared against Matrix Arena (`D:/CODING/LLM-ARENA/`).

> **Out of scope (not touched):** Supabase migrations, generation/retry RPCs, backend worker, provider APIs, Phase 1C paid API auth/rate-limit work, DB / RLS / state-machine logic.

---

## TL;DR

| Concern | Diagnosis | Action surface |
|---|---|---|
| **A. "Image/card creation" copy** | Single i18n key `deckview.cardCreation` rendered in 2 places ([DeckViewPG.tsx](orchestrator/frontend/src/pages/DeckViewPG.tsx) and [DeckView.tsx](orchestrator/frontend/src/pages/DeckView.tsx)). Maps from a **frontend-only** conditional, not from any backend `current_stage`. | Pure copy change in `lib/translations.ts` + condition tweak. |
| **B. Loader inconsistency** | Three independent loader families coexist: `ParticleSpinner` (canvas, theme-color, **not rainbow**), `GenerationWheelLoader` (conic-gradient teal/violet/rose orb — **this is the "rainbow" the user remembers**, currently only used during generation), and bare `Loader2`/`RefreshCw` Lucide icons with `animate-spin` (mono, often dim white = the "blue-ish" feel). Page-level loaders use `ParticleSpinner`; the prettier orb is hidden inside generate flow. | Promote `GenerationWheelLoader` (or an extracted `OrbSpinner`) to be the universal loader. Replace `ParticleSpinner` usages on Dashboard, Decks, DeckView, AdminRoute, App auth fallbacks. Audit dim Lucide spinners. |
| **C. Glass effect weak** | Dominant problems: (i) `backdrop-blur-sm` (4 px) and `backdrop-blur-md` (12 px) used in places that need 20–28 px; (ii) foreground alpha 0.55–0.95 on dark surfaces obliterates the blur underneath; (iii) `saturate()` mostly absent (and one overlay uses `saturate(0.7)` which **desaturates**); (iv) deck-modal "backdrop" is a solid `.gradient-bg`, not a blurred snapshot of the page. | CSS-only changes to `.glass*`, `.pg-glass`, `[data-slot="dialog-overlay"]`, modal backdrops, and a few Tailwind class swaps. No JSX restructure required. |

---

## A. Generation Card Status Labels

### Where the label is rendered

| Translation key | Value (en) | Used at |
|---|---|---|
| `deckview.cardCreation` | `Image/card creation` | [DeckViewPG.tsx:544](orchestrator/frontend/src/pages/DeckViewPG.tsx#L544), [DeckViewPG.tsx:746](orchestrator/frontend/src/pages/DeckViewPG.tsx#L746), [DeckView.tsx:557](orchestrator/frontend/src/pages/DeckView.tsx#L557), [DeckView.tsx:565](orchestrator/frontend/src/pages/DeckView.tsx#L565) |
| `deckview.cardFailure` | `Image/card failure` | [DeckViewPG.tsx:743](orchestrator/frontend/src/pages/DeckViewPG.tsx#L743), [DeckView.tsx:523](orchestrator/frontend/src/pages/DeckView.tsx#L523) |
| `deckview.processing` | `processing` | same locations (video deck branch) |
| `deckview.queued` | `queued` | [QueuePositionDisplay.tsx:62](orchestrator/frontend/src/components/QueuePositionDisplay.tsx#L62) and the deck pages |
| `deckview.failed` | `failed` | same locations (video deck branch) |

### Mapping source

There is **no central status mapper**. Each call site does the conditional inline:

```tsx
// e.g. DeckViewPG.tsx around line 740-748
word.status === 'failed'
  ? (isCardDeck ? t('deckview.cardFailure') : t('deckview.failed'))
  : isPending
    ? t('deckview.queued')
    : (isCardDeck ? t('deckview.cardCreation') : t('deckview.processing'))
```

The decision is purely frontend: `isCardDeck = deck_type === 'card'`. Backend `current_stage` / `status` is not consulted directly here — only `word.status` (`'pending' | 'processing' | 'failed' | 'completed'` etc.). Backend states stay untouched.

### Translation file (en/de/fr)

[frontend/src/lib/translations.ts](orchestrator/frontend/src/lib/translations.ts):

| Locale | Lines | Existing English | Existing DE / FR |
|---|---|---|---|
| en | 210, 211 | `Image/card failure`, `Image/card creation` | — |
| de | 554, 555 | — | (carries the same idea in German) |
| fr | 1006, 1007 | — | (same in French) |

### Recommendation hooks (non-prescriptive)

Two equally clean copy choices the user mentioned:

| Option | Replacement value | When to prefer |
|---|---|---|
| 1 | `Image creation` | If product team wants to emphasise that the card body **is** the image (matches "GPT Image-2 Card" / "Standard Card" naming). |
| 2 | `Card creation` | If we want to keep terminology generic, in case future card stages add audio / typography overlays. |

If we go with #1, also rename `cardFailure` → `imageCreationFailed` (or similar) and the variable name `isCardDeck` stays — only the *visible label* shortens.

There is no risk of touching backend states because the only place `'pending' | 'processing' | 'failed'` are interpreted is a frontend conditional that already produces the user-facing string.

---

## B. Loaders & Spinners — Full Inventory

### B.1 Reusable components

| Component | Path | Visual | Color basis | Default size | Where used |
|---|---|---|---|---|---|
| **ParticleSpinner** | [components/ui/ParticleSpinner.tsx](orchestrator/frontend/src/components/ui/ParticleSpinner.tsx) | Canvas-rendered parametric curve (presets: `rose`, `starburst`, `spiral`, `spirograph`, `heart`). 2–3k particles, sweeping head + fade tail. | Reads `--color-accent` from CSS at runtime. Trail is white on dark themes / accent on light themes. **No hue-rotate, no rainbow.** | 120–160 px | Page-level loaders (Dashboard, Decks, DeckView, App auth fallbacks, AdminRoute, Study) |
| **GenerationWheelLoader** | [components/ui/GenerationWheelLoader.tsx](orchestrator/frontend/src/components/ui/GenerationWheelLoader.tsx) | Conic-gradient orb + matching blurred halo + optional pulsing label/sublabel. | `conic-gradient(--pg-accent-teal, --pg-accent-violet, --pg-accent-rose, --pg-accent-teal)` with fallbacks `#0de2c3 / #8b5cf6 / #f43f5e`. **This is the multi-colour orb the user remembers.** | 96 px | `GenerateGO`, `GeneratePG`, `DeckViewPG` (during deck-being-generated wait) |
| **LoadingIndicator** | [components/ui/LoadingIndicator.tsx](orchestrator/frontend/src/components/ui/LoadingIndicator.tsx) | Wraps `GenerationWheelLoader size={72}` with an animated 0–3-dot ellipsis below. | Same as GWL. | 72 px | Music page only ([Music.tsx:309](orchestrator/frontend/src/pages/Music.tsx#L309)) |
| **Skeleton** | [components/ui/skeleton.tsx](orchestrator/frontend/src/components/ui/skeleton.tsx) | Pulsing block (`animate-pulse`). | `bg-accent`. | — | Misc. lists, cards. |

### B.2 Inline ad-hoc spinners

| Where | Implementation | Color | Notes |
|---|---|---|---|
| `Speak` (many) | Lucide `<Loader2 className="h-4 w-4 animate-spin" />` | Inherits text colour (often `text-white/40`, `text-[var(--text-muted)]`, or default). | This is what reads as a "blue-ish dim spinner" on dark surfaces. |
| Admin pages | Lucide `<RefreshCw className="animate-spin" />` | Inherits text colour. | Used during fetch/refresh. |
| `DeckPickerSheet`, `ConfirmStep`, `CategoryPicker`, `GrokPicker`, `VoiceSampleButton`, `EngineStatus` | `Loader2` + `animate-spin` | Inherits text colour. | Inline button or sheet spinners. |
| [SharePage.tsx:46](orchestrator/frontend/src/pages/SharePage.tsx#L46) | `<div className="border-4 border-teal-400 border-t-transparent animate-spin rounded-full" />` | Hard-coded teal. | One-off. |
| [music/PlaylistRow.tsx:150](orchestrator/frontend/src/components/music/PlaylistRow.tsx#L150) | Custom inline SVG arc + `animate-spin` | Inherited stroke. | One-off. |

### B.3 Per-route loader matrix

| Route / Component | Loader currently shown | File:Line |
|---|---|---|
| **App.tsx** Supabase init / auth bounce / route fallback | `ParticleSpinner preset="spirograph" size={160}` (×3) | [App.tsx:50](orchestrator/frontend/src/App.tsx#L50), [:69](orchestrator/frontend/src/App.tsx#L69), [:88](orchestrator/frontend/src/App.tsx#L88) |
| **DashboardPG** initial load | `ParticleSpinner preset="rose" size={140}` | [DashboardPG.tsx:238](orchestrator/frontend/src/pages/DashboardPG.tsx#L238) |
| **DecksPG** initial load | `ParticleSpinner preset="rose" size={140}` | [DecksPG.tsx:262](orchestrator/frontend/src/pages/DecksPG.tsx#L262) |
| **DeckViewPG** initial load | `ParticleSpinner preset="spiral" size={140}` | [DeckViewPG.tsx:369](orchestrator/frontend/src/pages/DeckViewPG.tsx#L369) |
| **DeckViewPG** generation-in-progress hero | `GenerationWheelLoader size={120}` + label `t('deckview.cardCreation')` | [DeckViewPG.tsx:541](orchestrator/frontend/src/pages/DeckViewPG.tsx#L541) |
| **GenerateGO** post-submit hero | `GenerationWheelLoader` with label/sublabel | [GenerateGO.tsx:445](orchestrator/frontend/src/pages/GenerateGO.tsx#L445) |
| **GeneratePG** post-submit hero | `GenerationWheelLoader` with label/sublabel | [GeneratePG.tsx:199](orchestrator/frontend/src/pages/GeneratePG.tsx#L199) |
| **Music** fetch songs | `LoadingIndicator text={t('music.loadingSongs')}` | [Music.tsx:309](orchestrator/frontend/src/pages/Music.tsx#L309) |
| **StudyPG** loading words | `ParticleSpinner` | [StudyPG.tsx:32](orchestrator/frontend/src/pages/StudyPG.tsx#L32) |
| **AdminRoute** authorising | `ParticleSpinner preset="rose" size={120}` | [AdminRoute.tsx:78](orchestrator/frontend/src/components/AdminRoute.tsx#L78) |
| **Speak** (most actions) | `Loader2 animate-spin` (dim text colour) | [Speak.tsx](orchestrator/frontend/src/pages/Speak.tsx) — 7 sites |
| **Admin/*** (Content, Metrics, Queue, Users, Quotas, Profiles, Voices) | `RefreshCw animate-spin` | various |
| **Card thumbnail** queued/processing slot | **No spinner graphic**, only the text label "queued" / "Image/card creation" / "failed" on a tinted gradient. | [DeckViewPG.tsx:740-748](orchestrator/frontend/src/pages/DeckViewPG.tsx#L740) |

### B.4 Git-history of the rainbow / hue-changing spinner

The user remembers a "rainbow / hue-changing multi-color spinner" that "was better and should be revived". That spinner is the **conic-gradient orb** (teal → violet → rose → teal). It is **still alive in the codebase** but only on generation-progress screens.

Timeline (commits on `main`, ordered):

| Commit | Date | What happened |
|---|---|---|
| [`4e025ad`](https://github.com/lokigod69/resonance-cloud/commit/4e025ad) | (earlier) | `feat: custom Glass Orb generate flow, study physics, Polish Glass pages` — **introduces the conic-gradient orb** on the Polish Glass generate flow (PG only). |
| [`cafafd5`](https://github.com/lokigod69/resonance-cloud/commit/cafafd5) | — | `feat(frontend): add queue position display for generation progress` — **replaces** the orb with the new `QueuePositionDisplay` card. |
| [`491c58e`](https://github.com/lokigod69/resonance-cloud/commit/491c58e) | 2026-04-21 | `restore(generate): bring back conic-gradient orb on both skins` — **restores** the orb, ports it to the Glassy skin (GenerateGO) for symmetry, keeps queue data as a small caption. Diff confirms `conic-gradient(from 0deg, var(--pg-accent-teal), var(--pg-accent-violet), var(--pg-accent-rose), var(--pg-accent-teal))` with a blurred halo. |
| [`b37b323`](https://github.com/lokigod69/resonance-cloud/commit/b37b323) | 2026-04-25 | `Unify generation loaders and player UI` — **extracts** the orb into reusable `GenerationWheelLoader.tsx` and migrates `GeneratePG`, `GenerateGO`, `DeckViewPG`, etc. to use it. Same conic-gradient values, just componentised. |
| [`fa9f52c`](https://github.com/lokigod69/resonance-cloud/commit/fa9f52c) | — | `Revamp semantic theme contract and skin-aware UI` — broader theme rework; keeps the orb. |

**There is no commit that "replaced rainbow with blue".** The "blue spinner" perception comes from two adjacent realities:

1. Page-level loaders (Dashboard / Decks / DeckView / Auth / Admin) never used the rainbow orb — they have always used `ParticleSpinner`, whose trail reads as white-on-dark or as the theme accent (which on Polish Glass is the dim teal `--pg-accent-teal #0de2c3` and on the dark theme is a similarly dim cyan-leaning accent). At small sizes and on dark backgrounds this scans as "blue spinner".
2. Buttons and inline states use Lucide `Loader2` + `animate-spin` with `text-white/40` or no class at all → renders as a dim grey-blue ring.

**Restorability (reviving the orb on page-level loaders):** Trivial. `GenerationWheelLoader` already accepts `size` and is purely declarative. Replacing `ParticleSpinner` call sites with `GenerationWheelLoader size={140}` (no label) would unify everything to the rainbow orb. Recommended micro-step: add a thin wrapper, e.g. `<OrbSpinner size>`, that renders just the orb+halo without the label/sublabel slots, so callers don't pass empty props.

### B.5 The "mismatched square/dark box" problem

Where a small `Loader2` is dropped into a parent with its own `bg-*` styling, the spinner is the only animated element in an otherwise opaque card. Examples:

- [DeckPickerSheet.tsx:110](orchestrator/frontend/src/components/deck/DeckPickerSheet.tsx#L110) — `<Loader2 className="h-5 w-5 animate-spin text-white/40" />` inside a sheet row.
- [Speak.tsx:975](orchestrator/frontend/src/pages/Speak.tsx#L975) and [:1305](orchestrator/frontend/src/pages/Speak.tsx#L1305) — `Loader2 h-7 w-7 / h-8 w-8` inside dark-tinted Speak cards.
- [CategoryPicker.tsx:220](orchestrator/frontend/src/components/generate/steps/CategoryPicker.tsx#L220) — same pattern in the generate flow's category picker.

These reads as "loader inside dark box" because the loader is mono and dim while the surrounding card is opaque dark. The fix is either (a) replace with a sized `OrbSpinner` (rainbow), or (b) at least centre and brighten the Lucide spinners (`text-[var(--pg-accent-teal)]`).

---

## C. Glass Effects — CSS Diagnosis

### C.1 Class catalog (Resonance)

Source files: [index.css](orchestrator/frontend/src/index.css), [themes/glass-orb.css](orchestrator/frontend/src/themes/glass-orb.css), [themes/theme-contract.css](orchestrator/frontend/src/themes/theme-contract.css).

| Class | File:Line | `backdrop-filter` | Background | Border | Box-shadow |
|---|---|---|---|---|---|
| `.glass` | [index.css:425](orchestrator/frontend/src/index.css#L425) | `blur(24px)` | `rgba(255,255,255,0.05)` | `1px solid rgba(255,255,255,0.1)` | none |
| `.glass-strong` | [index.css:433](orchestrator/frontend/src/index.css#L433) | `blur(32px)` | `rgba(255,255,255,0.1)` | `1px solid rgba(255,255,255,0.15)` | none |
| `.glass-hover:hover` | [index.css:441](orchestrator/frontend/src/index.css#L441) | inherited | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.15)` | none |
| `.pg-glass` | [index.css:500](orchestrator/frontend/src/index.css#L500) | `blur(20px)` (+`-webkit-`) | gradient `surface-glass-strong → surface-glass` | `1px solid var(--pg-glass-border)` | `var(--pg-glass-shadow)` (elevated + inset) |
| `.speak-glass-card` (base) | [index.css:646](orchestrator/frontend/src/index.css#L646) | `blur(18px)` | `rgba(15,23,42,0.55)` | `1px solid rgba(255,255,255,0.1)` | `0 18px 45px rgba(2,6,23,0.28), inset 0 1px 0 rgba(255,255,255,0.1)` |
| `.classic-deck-card` | [index.css:336](orchestrator/frontend/src/index.css#L336) | `blur(12px)` | `rgba(20,24,34,0.45)` | — | — |
| `.skin-glassy .glass` | [index.css:520](orchestrator/frontend/src/index.css#L520) | `blur(20px)` (+`-webkit-`) | `var(--surface-glass)` | `1px solid var(--border-subtle)` | `var(--shadow-soft), inset 0 1px 1px ...` |
| `.skin-glassy .glass-strong` | [index.css:530](orchestrator/frontend/src/index.css#L530) | `blur(24px)` (+`-webkit-`) | `var(--surface-glass-strong)` | `1px solid var(--border-subtle)` | `var(--shadow-elevated), inset 0 1px 1px ...` |
| `.gen-orb` | [glass-orb.css:68](orchestrator/frontend/src/themes/glass-orb.css#L68) | `blur(20px)` | gradient `rgba(255,255,255,0.08) → 0` | `1px solid rgba(255,255,255,0.15)` | outer `0 8px 32px rgba(0,0,0,0.4)` + dual inset highlights |
| `[data-slot="dialog-overlay"]` (glass-orb skin) | [glass-orb.css:18](orchestrator/frontend/src/themes/glass-orb.css#L18) | **`blur(28px) saturate(0.7)`** | `color-mix(in srgb, var(--app-bg) 78%, transparent)` | — | — |
| `[data-slot="dialog-overlay"]` (theme-contract default) | [theme-contract.css:282](orchestrator/frontend/src/themes/theme-contract.css#L282) | `blur(28px) saturate(1.35)` | `color-mix(in srgb, var(--app-bg) 82%, transparent)` | — | — |

### C.2 Tailwind utility usage in JSX

| Location | Class on element | Issue |
|---|---|---|
| [components/ui/dialog.tsx:42](orchestrator/frontend/src/components/ui/dialog.tsx#L42) | `bg-black/70 backdrop-blur-md` | 12 px blur is on the lower side; 70 % alpha mostly hides what's behind. |
| [components/dashboard/WordDetailModal.tsx:64](orchestrator/frontend/src/components/dashboard/WordDetailModal.tsx#L64) | `bg-black/70 backdrop-blur-sm` | 4 px blur — almost no perceptible blur. |
| [components/deck/CardWordViewerModal.tsx:103](orchestrator/frontend/src/components/deck/CardWordViewerModal.tsx#L103) | outer: `fixed inset-0 z-50 gradient-bg` | **No blur and no transparency** — the modal "background" is a solid 135deg dark gradient `#1e1b2e → #131122`. There is no blurred snapshot of the page beneath. |
| [components/deck/CardWordViewerModal.tsx:125](orchestrator/frontend/src/components/deck/CardWordViewerModal.tsx#L125) | nav arrows: `bg-black/50 backdrop-blur-sm` | 4 px blur + 50 % alpha — barely glassy. |
| [pages/DeckView.tsx:642](orchestrator/frontend/src/pages/DeckView.tsx#L642) | bottom bar: `bg-black/80 backdrop-blur-xl border-t border-white/10` | 80 % alpha is so opaque the 44 px blur is almost invisible. |
| [components/speak/SpeakHistoryPanel.tsx:259](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L259) | `bg-gray-950/95 backdrop-blur-xl` | 95 % alpha → nearly opaque; blur effectively invisible. |
| [components/VersionBadge.tsx:19](orchestrator/frontend/src/components/VersionBadge.tsx#L19) | `bg-black/60 border border-white/20 backdrop-blur-sm` | 4 px blur — minor frosting only. |

### C.3 Why the glass looks weak — diagnostic checklist

1. **Blur radii too low in the Tailwind sites.** `backdrop-blur-sm` (4 px) and `backdrop-blur-md` (12 px) are on most modals/overlays. True glass requires 20–28 px to see the colour bleed that gives the effect depth. Only the deck-view bottom bar uses `backdrop-blur-xl` (44 px), and even there the 80 % opaque foreground kills it.
2. **Foreground alpha too high.** Glass is a contrast effect: you need to *see* the blurred content. With `bg-black/95`, `bg-gray-950/95`, `bg-black/80` the blurred snapshot is hidden. Sweet spot for dark-tinted glass is ~0.40–0.55. Light-tinted glass should be 0.05–0.12.
3. **`saturate()` mostly missing.** Only the two `[data-slot="dialog-overlay"]` rules use saturate, and the glass-orb variant uses `saturate(0.7)` — that **desaturates** colours, making the blur look muddy and washed-out. Best practice is `saturate(1.35–1.8)`. The theme-contract value of `1.35` is right; the glass-orb value of `0.7` is the cause of the "dead" feel on dialog overlays in that skin.
4. **No "two-layer" pattern on card-style modals.** The polished modal pattern is *separate overlay* (heavy blur + dark tint) **plus** *opaque content panel*. Resonance's `WordDetailModal` does this correctly (`bg-black/70 backdrop-blur-sm` overlay + `.pg-glass` panel) but the modal panel itself is then also semi-transparent — so we get glass-on-glass and lose perceived solidity. `CardWordViewerModal` skips the pattern entirely (solid gradient backdrop, no blur).
5. **Stacking-context risks.** [.pg-dot-grid](orchestrator/frontend/src/index.css#L566) uses `transform: perspective(600px) rotateX(25deg)`, creating a new stacking context. Any glass element nested inside such an ancestor will only blur content within that subtree, not the page. (Probably not the main culprit here, but worth a sweep when fixing.)
6. **Card thumbnail "queued/processing" placeholders are flat.** The placeholder uses `bg-gradient-to-br from-white/5 to-transparent` ([DeckViewPG.tsx:740](orchestrator/frontend/src/pages/DeckViewPG.tsx#L740)) with no blur and no animated graphic. It reads as a flat dim square — the "mismatched dark box" feel.

### C.4 Specific values that look off (tabulated)

| Surface | Current | Suggested target | Reason |
|---|---|---|---|
| `.classic-deck-card` | `blur(12px)` + 0.45 dark | `blur(20px) saturate(1.4)` + 0.40 dark | Bring it up to parity with `.pg-glass`. |
| `.speak-glass-card` (base) | `blur(18px)` + 0.55 dark | `blur(24px) saturate(1.4)` + 0.45 dark | 0.55 → 0.45 to let blur breathe. |
| Glass-orb dialog overlay | `blur(28px) saturate(0.7)` | `blur(28px) saturate(1.35)` | Match theme-contract — desaturation is reading as "dead". |
| Tailwind `backdrop-blur-sm` overlays | 4 px | swap to `backdrop-blur-xl` (44 px) where it's a fullscreen overlay; keep `md` for badges | The viewer-modal arrows specifically need a meaningful blur. |
| `bg-black/80`, `bg-gray-950/95` overlays | 0.80–0.95 alpha | 0.45–0.55 alpha | High alpha kills blur. |
| `CardWordViewerModal` outer | `gradient-bg` solid | `bg-black/55 backdrop-blur-2xl saturate-[1.35]` over a separate gradient layer | Make the modal feel like real glass over the page. |

---

## D. Matrix Arena Comparison (LLM-ARENA)

Repo: `D:/CODING/LLM-ARENA/`. Stack: Next.js 15 + React 19 + Tailwind 4 + Framer Motion. Tailwind config exposes a custom blur token `backdropBlur.matrix = '10px'`.

### D.1 Glass class catalog (Matrix Arena)

| Class | File | backdrop-filter | Background | Border | Shadow |
|---|---|---|---|---|---|
| `.matrix-panel` | `globals.css:81–91` | `blur(10px)` | `linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(10,10,10,0.95) 50%, rgba(0,0,0,0.9) 100%)` | `1px solid #008822` | `0 0 20px rgba(0,255,65,0.2), inset 0 0 20px rgba(0,255,65,0.05)` |
| `.matrix-message` | `globals.css:203–215` | `blur(4px)` (+`-webkit-`) | gradient `rgba(0,0,0,0.95) → rgba(20,20,20,0.95)` | `1px solid #008822` | `border-radius: 8px` |
| Modal backdrop | `DebatePreviewModal.tsx:109` | `backdrop-blur-lg` (~16 px) | `bg-black/95` | — | — |
| Modal panel | `DebatePreviewModal.tsx:121` | none | `bg-matrix-black` (fully opaque) | `1px border-matrix-green` | `shadow-[0_0_50px_rgba(0,255,0,0.2)]` |
| Header | every page | `backdrop-blur-sm` (~4 px) | `linear-gradient(to right, matrix-black, matrix-dark, matrix-black)` | bottom only | — |
| Admin card | `admin/dashboard/page.tsx` | `backdrop-blur` (~4 px) | `bg-black/60` | `1px solid #00ff41` | `0 0 15px rgba(0,255,65,0.1)` |

### D.2 The pattern Matrix Arena uses

1. **Opaque-backdrop + opaque-panel**, *not* glass-on-glass. The modal "feels glassy" because the **backdrop** is a 95-%-opaque-black layer with `backdrop-blur-lg` over the page; the **panel** is fully opaque. There is no semi-transparent panel competing.
2. **Outer green glow shadow** does the depth work, not inset highlights: `0 0 50px rgba(0,255,0,0.2)`.
3. **No `saturate()` anywhere** — Matrix Arena does not boost saturation.
4. **Sticky header + small blur (4 px)** is enough because the header is on top of a page that does scroll under it; you only need a hint of blur for legibility.
5. **`::before` pseudo-elements** add accent gradient overlays at low opacity (≤10 %) and a 3-second scan-line animation on messages.

### D.3 Verbatim snippets worth copying / adapting

```tsx
// MATRIX: modal backdrop + panel (DebatePreviewModal.tsx)
<motion.div
  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  className="fixed inset-0 bg-black/95 backdrop-blur-lg z-[100]"
  onClick={onClose}
/>
<div className="w-full max-w-6xl bg-matrix-black border border-matrix-green rounded-xl shadow-[0_0_50px_rgba(0,255,0,0.2)]" />
```

```css
/* MATRIX: globals.css */
.matrix-panel {
  background: linear-gradient(135deg,
    rgba(0,0,0,0.9) 0%,
    rgba(10,10,10,0.95) 50%,
    rgba(0,0,0,0.9) 100%);
  border: 1px solid var(--matrix-green-dark);
  box-shadow:
    0 0 20px rgba(0,255,65,0.2),
    inset 0 0 20px rgba(0,255,65,0.05);
  backdrop-filter: blur(10px);
}
```

```ts
// MATRIX: tailwind.config.ts
backdropBlur: { matrix: '10px' }
```

### D.4 What Resonance should adapt vs. ignore

| Adapt | Ignore |
|---|---|
| Two-layer modal pattern (heavy-blur backdrop + opaque solid panel). | The 95 %-opaque backdrop is too dark for Resonance's lighter aesthetic — use 0.55–0.65 with `saturate(1.35)` instead. |
| Outer glow shadow on cards (`box-shadow: 0 0 Xpx rgba(accent, 0.2)`) for depth. | Solid green `#008822` borders — Resonance uses themed accents (`--pg-accent-teal`, etc.). |
| Custom Tailwind blur token (`backdropBlur.glass = '24px'`) so we can write `backdrop-blur-glass` consistently. | Hard-coded `matrix-green` — keep our CSS-variable-driven palette. |
| Sticky-header pattern: gradient bg + `backdrop-blur-sm` is fine for nav legibility. | Keep our skin-aware variables. |

What Matrix does *worse* than us: it has no `saturate()` and no inset light highlights. Resonance's `.pg-glass` (with its inset 1 px light + elevated shadow) is more sophisticated when actually shown over varied content. The Matrix style is appropriate because Matrix Arena's content is monochrome; Resonance's colourful imagery benefits from a saturate boost.

---

## E. Recommended Implementation Plan (Future PR — not this one)

Phased so the riskiest work (glass) is last. All changes are CSS / class swaps / one new wrapper component. **No backend, no DB, no RPC, no state-machine touch.**

### Phase 1 — Status copy (lowest risk)
1. Rename i18n keys:
   - `deckview.cardCreation` value → either `Image creation` (if going single-noun) or `Card creation` (if generic) for en / de / fr.
   - `deckview.cardFailure` value → `Image failed` / `Card failed` to match.
2. No JSX changes needed — the conditionals already pick this key for card decks.

### Phase 2 — Loader unification
1. Add a thin wrapper component `OrbSpinner` (file: `frontend/src/components/ui/OrbSpinner.tsx`) that renders just the conic-gradient orb + halo from `GenerationWheelLoader`, parameterised by `size`. No label/sublabel slots.
2. Replace `<ParticleSpinner ... />` call sites:
   - [App.tsx:50](orchestrator/frontend/src/App.tsx#L50), [:69](orchestrator/frontend/src/App.tsx#L69), [:88](orchestrator/frontend/src/App.tsx#L88)
   - [DashboardPG.tsx:238](orchestrator/frontend/src/pages/DashboardPG.tsx#L238)
   - [DecksPG.tsx:262](orchestrator/frontend/src/pages/DecksPG.tsx#L262)
   - [DeckViewPG.tsx:369](orchestrator/frontend/src/pages/DeckViewPG.tsx#L369)
   - [AdminRoute.tsx:78](orchestrator/frontend/src/components/AdminRoute.tsx#L78)
   - [StudyPG.tsx:32](orchestrator/frontend/src/pages/StudyPG.tsx#L32)
3. Decide fate of [components/ui/ParticleSpinner.tsx](orchestrator/frontend/src/components/ui/ParticleSpinner.tsx): delete after grep confirms zero remaining usages, or leave as decorative for marketing pages (low cost).
4. Touch the dimmest Lucide spots — at minimum brighten or swap on Speak / DeckPickerSheet. Consider a `<MiniSpinner>` shared variant that uses the orb at 16–24 px.
5. Card thumbnail queued/processing placeholders: add a small centred `<OrbSpinner size={28}>` above the text label so users see motion, not a flat box.

### Phase 3 — Glass effect (highest risk, CSS only)
1. **In `index.css`:** add `saturate(1.35)` to `.glass`, `.glass-strong`, `.pg-glass`, `.classic-deck-card`, `.speak-glass-card`. Bump `.classic-deck-card` from `blur(12px)` to `blur(20px)`.
2. **In `themes/glass-orb.css`:** change `[data-slot="dialog-overlay"]`'s `saturate(0.7)` → `saturate(1.35)`. Match `theme-contract.css`.
3. **Tailwind config:** add a custom `backdropBlur.glass = 24px` and use `backdrop-blur-glass` consistently in modal overlays.
4. **JSX swaps in modals:**
   - [components/ui/dialog.tsx:42](orchestrator/frontend/src/components/ui/dialog.tsx#L42) — `bg-black/70 backdrop-blur-md` → `bg-black/55 backdrop-blur-glass saturate-[1.35]`.
   - [components/dashboard/WordDetailModal.tsx:64](orchestrator/frontend/src/components/dashboard/WordDetailModal.tsx#L64) — `backdrop-blur-sm` → `backdrop-blur-glass`.
   - [components/deck/CardWordViewerModal.tsx:103](orchestrator/frontend/src/components/deck/CardWordViewerModal.tsx#L103) — replace solid `gradient-bg` with a two-layer overlay (page-blur layer + content panel).
   - [components/deck/CardWordViewerModal.tsx:125](orchestrator/frontend/src/components/deck/CardWordViewerModal.tsx#L125) — nav arrows from `bg-black/50 backdrop-blur-sm` → `bg-black/40 backdrop-blur-md saturate-[1.35]`.
   - [components/speak/SpeakHistoryPanel.tsx:259](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L259) — `bg-gray-950/95` → `bg-gray-950/55`.
   - [pages/DeckView.tsx:642](orchestrator/frontend/src/pages/DeckView.tsx#L642) — `bg-black/80 backdrop-blur-xl` → `bg-black/55 backdrop-blur-xl saturate-[1.35]`.

### Acceptance criteria for the implementation PR

- Dashboard / Decks / DeckView / Auth fallback / Admin show the same conic-gradient orb at the same size, on the same dark/light scrim.
- The "Image/card creation" label is gone from all visible card states; only the new shorter copy appears.
- Dialog overlay (open any dialog) blurs the page perceptibly and looks vibrant, not muddy.
- CardWordViewerModal: with another modal or page content behind, you can see the page colours bleed through the modal's backdrop.
- No regressions in Speak, Generate, or Music flows (visual only, no state).

---

## F. Risks

1. **`ParticleSpinner` removal** could touch routes we missed. Mitigation: do an explicit `Grep "ParticleSpinner"` sweep before deletion; consider keeping the file but marking it deprecated.
2. **`saturate()` boost on `.glass`** could over-saturate light-mode pages where the surface is already bright. Mitigation: gate saturate by `[data-skin]` if it looks bad on classic skin in light mode.
3. **Lower foreground alpha on dark overlays** can hurt readability of text *inside* the overlay (e.g. the bottom control bar in `DeckView`). Mitigation: ensure interior text containers have their own opaque background or strong drop-shadow.
4. **`backdrop-filter` performance on low-end Android** — bigger blur (24–28 px) is expensive. Mitigation: only apply heavy blur to fullscreen overlays (rare, transient), not to per-card surfaces. Verify on a slow Android device before merging.
5. **Glass-on-glass elimination** in modals requires deciding whether the *panel* stays glass. If we change it to opaque, deck-view designs that rely on layering may need re-designing.
6. **Translation gap** on copy change — `de` and `fr` translations of the new key value need to be reviewed by a native speaker (or at least re-checked) so we don't ship "Image/card" in one locale and a different concept in another.
7. **Dead `ParticleSpinner.tsx` could rot** if we keep it deprecated. Recommendation: delete in the same PR that flips the call sites.

---

## G. Recommended Test / Check Commands

Run these from `D:/CODING/ResonanceTEST/orchestrator/`:

```bash
# Type / build sanity (no source changes in this audit, expected to pass):
cd frontend && npm run build

# Inventory commands re-runnable to verify before/after:
git grep -n "ParticleSpinner\|GenerationWheelLoader\|backdrop-blur\|backdrop-filter\|saturate(" -- frontend/src

# Status-copy check:
git grep -n "Image/card\|cardCreation\|cardFailure" -- frontend/src

# Confirm no backend / RPC / Supabase migration touched in the implementation PR:
git diff --stat | grep -E "supabase/migrations|src/orchestration|src/cloud_engines|src/api"  # should print nothing
```

For the **implementation** PR (when it lands), additionally:

```bash
# Visual smoke (start dev server, take screenshots at 360px and 1280px):
cd frontend && npm run dev
# → /dashboard, /decks, /generate (mid-submission), /deck/:id (during gen),
#   /study, /music, /speak, an admin page, and any open dialog (settings, deck delete confirm).

# Mobile-specific visual check:
# Pixel 5 / iPhone SE viewports for: orb size at 140 px, modal blur, bottom bar contrast.
```

---

## Appendix — Files referenced (for the implementation PR's "files to touch")

### Required to touch
- [frontend/src/lib/translations.ts](orchestrator/frontend/src/lib/translations.ts) — copy change.
- [frontend/src/components/ui/GenerationWheelLoader.tsx](orchestrator/frontend/src/components/ui/GenerationWheelLoader.tsx) — extract `OrbSpinner` from this.
- New: `frontend/src/components/ui/OrbSpinner.tsx`.
- [frontend/src/App.tsx](orchestrator/frontend/src/App.tsx) (×3 spinner sites).
- [frontend/src/pages/DashboardPG.tsx](orchestrator/frontend/src/pages/DashboardPG.tsx).
- [frontend/src/pages/DecksPG.tsx](orchestrator/frontend/src/pages/DecksPG.tsx).
- [frontend/src/pages/DeckViewPG.tsx](orchestrator/frontend/src/pages/DeckViewPG.tsx).
- [frontend/src/pages/StudyPG.tsx](orchestrator/frontend/src/pages/StudyPG.tsx).
- [frontend/src/components/AdminRoute.tsx](orchestrator/frontend/src/components/AdminRoute.tsx).
- [frontend/src/index.css](orchestrator/frontend/src/index.css) — saturate / blur tweaks on `.glass*`, `.classic-deck-card`, `.speak-glass-card`.
- [frontend/src/themes/glass-orb.css](orchestrator/frontend/src/themes/glass-orb.css) — fix `saturate(0.7)` → `saturate(1.35)` on dialog-overlay.
- [frontend/src/components/ui/dialog.tsx](orchestrator/frontend/src/components/ui/dialog.tsx) — overlay class.
- [frontend/src/components/dashboard/WordDetailModal.tsx](orchestrator/frontend/src/components/dashboard/WordDetailModal.tsx) — overlay class.
- [frontend/src/components/deck/CardWordViewerModal.tsx](orchestrator/frontend/src/components/deck/CardWordViewerModal.tsx) — backdrop pattern + nav-arrow blur.
- [frontend/src/components/speak/SpeakHistoryPanel.tsx](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx) — alpha.
- [frontend/src/pages/DeckView.tsx](orchestrator/frontend/src/pages/DeckView.tsx) — bottom control bar alpha.
- `frontend/tailwind.config.{ts,js}` (or v4 equivalent) — add custom `backdropBlur.glass` token.

### Probably to delete after migration
- [frontend/src/components/ui/ParticleSpinner.tsx](orchestrator/frontend/src/components/ui/ParticleSpinner.tsx) — once all callers migrated.

### Off-limits (per scope)
- `frontend/supabase/migrations/**`
- `src/orchestration/**`, `src/cloud_engines/**`, `src/api/**`
- All worker / provider / state-machine code
- Phase 1C paid API auth / rate limit work

---

## Verification of this audit

| Item | Result |
|---|---|
| `git status` | On `main`, up to date with `origin/main`. Pre-existing modified files: `frontend/src/components/settings/fieldConfigs.ts`, `tests/test_frontend_duration_fields.py`. None of those are touched by this audit. |
| `npm run build` | **Skipped** — this audit is doc-only (`docs/FrontendPolish/FRONTEND_POLISH_GLASS_LOADERS_AUDIT.md`); no source files were modified, so the build state is unchanged from before the audit ran. Rerun `cd frontend && npm run build` if you want to baseline. |
| Backend reference | Backend behaviour is intentionally untouched. All findings live in `frontend/src/**`. |
| Branch check | Currently on `main`. Per the project's "frontend on main" convention, no branch switch was made. The user's task brief permits either `main` or `frontend-polish-glass-loaders` — `main` chosen because the audit is doc-only and reversible. |
