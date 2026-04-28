# Investigation — Header Backdrop Blur (Glassy + Classic)

**Scope:** Inspect why the fixed/sticky top nav reads as "too transparent" — content scrolls behind it without being properly obscured. Investigate, propose, then implement.

**Out of scope:** Warm Linen (being redesigned separately).

---

## 1. Surface inventory

### 1.1 Components rendering the header

There is **one** styling source — class `.app-topnav` defined in [theme-contract.css:269-276](orchestrator/frontend/src/themes/theme-contract.css#L269-L276) — used by **two** layout shells:

| Layout | File:Line | Skin | Position | z‑index | Mounted via |
|--------|-----------|------|----------|---------|-------------|
| `AppLayout` → `AppHeader` | [AppHeader.tsx:70](orchestrator/frontend/src/components/layout/AppHeader.tsx#L70) | Classic + admin routes | `sticky top-0` | `z-40` | `<AppLayout>` route element |
| `PolishGlassLayout` (inline `<nav>`) | [PolishGlassLayout.tsx:51](orchestrator/frontend/src/components/layout/PolishGlassLayout.tsx#L51) | Glassy | `fixed top-0 left-0 w-full` | `z-50` | `<PolishGlassLayout>` route element |
| Glassy mobile menu | [PolishGlassLayout.tsx:136](orchestrator/frontend/src/components/layout/PolishGlassLayout.tsx#L136) | Glassy mobile | `fixed top-[60px]` | `z-40` | Same component, hamburger expansion |

Skin selection sits in [App.tsx:131-157](orchestrator/frontend/src/App.tsx#L131-L157): `skin === 'glassy'` → `PolishGlassLayout`, else → `AppLayout`. Admin routes always use `AppLayout` regardless of skin ([App.tsx:160-169](orchestrator/frontend/src/App.tsx#L160-L169)).

Pages rendered under each:
- **Classic** (AppLayout): Dashboard, Decks, Generate, DeckView, Study (selector + Study), Music (legacy), Speak, all admin pages.
- **Glassy** (PolishGlassLayout): DashboardPG, DecksPG, GenerateGO, DeckViewPG, StudyModeSelector, StudyPG, StudyFlashcard, StudyAudio, MusicPG, Speak.

### 1.2 Skin/theme matrix

[SkinContext.tsx:3](orchestrator/frontend/src/contexts/SkinContext.tsx#L3) → `'classic' | 'glassy'`.
[ThemeContext.tsx:4](orchestrator/frontend/src/contexts/ThemeContext.tsx#L4) → `'midnight' | 'rainy-day' | 'red-wine' | 'slate' | 'warm-linen'`.

10 skin × theme combinations. Classes applied to `<html>`: `skin-{skin} theme-{theme}` (+ `dark` for non-light themes).

### 1.3 Header CSS chain (current production)

[theme-contract.css:269](orchestrator/frontend/src/themes/theme-contract.css#L269):

```css
.app-topnav {
  background: var(--nav-bg);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--app-bg) 34%, transparent);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
```

`--nav-bg` resolution per theme (verified by `getComputedStyle` injection on a synthetic `header.app-topnav`, scoped to each theme/skin combo):

| Skin + Theme | `--nav-bg` (effective) | Background opacity |
|--------------|-----------------------|--------------------|
| classic + midnight | `rgba(8, 11, 12, 0.9)` | 90% |
| classic + rainy-day | `rgba(12, 19, 27, 0.9)` | 90% |
| classic + red-wine | `rgba(18, 7, 13, 0.9)` | 90% |
| classic + slate | `rgba(15, 18, 22, 0.9)` | 90% |
| classic + warm-linen | `rgba(246, 240, 231, 0.92)` | 92% |
| glassy + midnight | `rgba(8, 11, 12, 0.9)` ← theme wins, not `.skin-glassy` | 90% |
| glassy + rainy-day | `rgba(12, 19, 27, 0.9)` | 90% |
| glassy + red-wine | `rgba(18, 7, 13, 0.9)` | 90% |
| glassy + slate | `rgba(15, 18, 22, 0.9)` | 90% |
| glassy + warm-linen | `rgba(246, 240, 231, 0.92)` | 92% |

**Cascade note (worth flagging):** `.skin-glassy` in [theme-contract.css:107](orchestrator/frontend/src/themes/theme-contract.css#L107) tries to override `--nav-bg` with `color-mix(in srgb, var(--app-bg) 90%, transparent)`. It loses to per-theme files because `theme-contract.css` is imported **before** `midnight.css` etc. in [main.tsx:4-9](orchestrator/frontend/src/main.tsx#L4-L9), and both selectors have the same specificity (0,1,0). Source order: theme file later → theme file wins. So `.skin-glassy`'s `--nav-bg` rule is **dead code today**. Glassy and Classic produce identical computed `--nav-bg` per theme.

`backdrop-filter` is identical across all combos: `blur(18px)`. Both `backdrop-filter` and `-webkit-backdrop-filter` are present (Safari-compatible).

---

## 2. Why it fails

### 2.1 Root cause: 90% alpha is not enough against high-contrast content

10% transparency over `blur(18px)` lets bright/white content underneath leak through visibly. With dark theme tokens (`rgba(8, 11, 12, 0.9)`), the blend math under a white panel is roughly:

- output = 0.9 × `rgb(8, 11, 12)` + 0.1 × blurred-white ≈ `rgb(33, 36, 37)`

A "near-black" header reading as `rgb(33, 36, 37)` is perceptibly grayer than the dark background of the rest of the page. **The user perceives this as "the header is transparent."** Verified empirically:

- [investigation/07a-current-white-directly-under-header.png](investigation/07a-current-white-directly-under-header.png) — production styles (0.9 + blur 18px), white panel directly under header. Top of header is visibly washed out compared to the dark page chrome.
- [investigation/06b-low-alpha-heavy-blur.png](investigation/06b-low-alpha-heavy-blur.png) — control: same scene with 0.30 + blur(40px). Confirms `backdrop-filter` IS firing in the test environment; the perceived washout in production is a function of opacity choice, not a missing filter.

### 2.2 Blur radius is too small to soften content boundaries

`blur(18px)` over a 64px-tall header samples roughly the same band of pixels behind it. When solid text (e.g., album art labels) lies behind, 18px doesn't smear it enough to be unrecognizable — it just slightly blurs the letters. For frosted-glass-style obscuration, 24-32px+ is needed.

### 2.3 No saturation adjustment

Frosted glass surfaces in iOS / macOS Big Sur typically apply `saturate(1.4-1.8)` so the ambient color shows as a soft hue cast rather than a literal photo. Production code does not. Bright content underneath leaks through as recognizable color regions, not a generic tint.

### 2.4 Why "Classic feels worse than Glassy" today

Both compute identical `.app-topnav` CSS values. The difference users perceive comes from **what scrolls under**:

- **Classic** (`AppLayout`): the page content scrolls in the body directly — there is no fixed atmosphere layer between page content and the header backdrop. Bright deck cards / album art slide right up under the 90% alpha header.
- **Glassy** (`PolishGlassLayout`): a fixed `.glassy-atmosphere` element ([theme-contract.css:159-188](orchestrator/frontend/src/themes/theme-contract.css#L159-L188)) sits at `z-index: 0` between `--app-bg` and the page content. It's a heavy radial-gradient haze pinned to the viewport. As the user scrolls, the haze stays put — so the header backdrop samples a relatively constant ambient color, masking the leak. Classic has nothing like it.

This is a **secondary effect**. The primary fix (alpha + blur + saturate on `.app-topnav`) closes the gap regardless. The `.glassy-atmosphere` happens to be doing some of the masking that the header itself should be doing.

### 2.5 Things checked and ruled out

- **Browser fallback for `backdrop-filter`:** both `backdrop-filter` and `-webkit-backdrop-filter` are present. Modern Chrome/Edge/Safari/Firefox 103+ all support it. Where unsupported, the `var(--nav-bg)` background still paints — the header would just lose blur, not visibility. Not the cause of this complaint.
- **Parent `transform`/`filter`/`perspective` breaking the fixed child:** none on the path from `<body>` → `.app-shell` → `<nav>`. `.skin-glassy .app-shell` adds `position: relative; isolation: isolate` ([theme-contract.css:149-153](orchestrator/frontend/src/themes/theme-contract.css#L149-L153)) — `isolation: isolate` creates a new stacking context but does **not** establish a containing block for `position: fixed` descendants and does not interfere with `backdrop-filter`. Verified: computed `position` is `fixed` on the Glassy header.
- **Parent `overflow`:** `PolishGlassLayout`'s root has `overflow-x-hidden overflow-y-auto`. This does not clip a `position: fixed` descendant (no transform/filter on the parent that would create a containing block). Header stays pinned and `backdrop-filter` works against the viewport content.
- **Anything painting above the header:** [index.css:760-768](orchestrator/frontend/src/index.css#L760-L768) has a `body::before` noise overlay at `z-index: 9999` with `opacity: 0.04` and `mix-blend-mode: overlay`. Sits above everything but is so faint it does not visibly affect header contrast (verified by toggling it in the inspector — no observable change). Not the cause.
- **Stacking context contamination:** the only competing fixed element behind the header is `.glassy-atmosphere` at `z-index: 0`. Nothing renders between it and the header.

### 2.6 Other surfaces using `--nav-bg`

`.speak-chatbar` ([theme-contract.css:548-554](orchestrator/frontend/src/themes/theme-contract.css#L548-L554)) reuses `--nav-bg` and the same `blur(18px)`. This is a bottom chat input bar — different context (anchored at bottom of Speak page, narrower content scrolling under). Out of scope for this fix; flag for the Speak redesign.

`MusicPG` page ([MusicPG.tsx:189](orchestrator/frontend/src/pages/MusicPG.tsx#L189)) builds its own sticky filter row using `bg-[var(--nav-bg)] backdrop-blur-md`. That's a sub-header sitting under the main nav. The token change in this fix will inherit there too — net positive (filter row will become a more solid frosted band) and matches design intent.

### 2.7 Mobile / iOS Safari

- `-webkit-backdrop-filter` is present everywhere `backdrop-filter` is.
- iOS Safari 9+ supports `-webkit-backdrop-filter`. On older iOS (rare in 2026), the prefix-only fallback gracefully degrades to the rgba background (90%+) which is still mostly opaque.
- No transform-based parents on iOS path → no known iOS-specific quirks.

---

## 3. Proposal

### 3.1 Targets

**Classic header:**
- Visual: solid frosted surface; underlying content registers only as a faint warmth/coolness shift, never as recognizable shape or text.
- Token: `--nav-bg` opacity ≥ 94%. Effectively reads as solid; the residual transparency exists only to allow the blur to inherit a subtle ambient cast from below.
- Filter: `blur(28px) saturate(1.35)`. The saturate boost makes the subtle leak feel intentional (warm tint, cool tint) rather than accidental color contamination.

**Glassy header:**
- Visual: heavily blurred frosted glass; ambient color is a felt presence (a wash of warmth or coolness) but no shape or text is readable through it.
- Token: `--nav-bg` opacity ~85%. More glass-like than Classic — leans into the skin's identity — but pushed up from today's 90% becoming 85% means the blur has to do more work, not less. The blur radius compensates.
- Filter: `blur(36px) saturate(1.4)`. Heavier blur than Classic. Total readability of underlying shapes is destroyed.

Both retain a 1px bottom border (current `var(--border-subtle)`) to keep the surface edge defined. Box-shadow is kept (current value works).

### 3.2 Concrete changes

**File:** [orchestrator/frontend/src/themes/theme-contract.css](orchestrator/frontend/src/themes/theme-contract.css)

1. Lift `--nav-bg` opacity in every theme file and remove the dead `.skin-glassy` token override. Per-theme alpha goes from `0.9` → `0.94`.

2. Re-introduce a per-skin `--nav-bg` override that actually wins by using a more specific selector (`.skin-glassy[class*="theme-"]`) OR by moving the `.skin-glassy` `--nav-bg` rule to a position-after-themes file. Picking option (a) for stability — specificity (0,2,0) beats theme-only (0,1,0) regardless of source order. Glassy override drops alpha back to `~0.85` to keep its glass identity.

3. Replace the `.app-topnav` `backdrop-filter: blur(18px)` with a skin-aware pair:
   ```css
   .app-topnav { backdrop-filter: blur(28px) saturate(1.35); -webkit-backdrop-filter: blur(28px) saturate(1.35); }
   .skin-glassy .app-topnav { backdrop-filter: blur(36px) saturate(1.4); -webkit-backdrop-filter: blur(36px) saturate(1.4); }
   ```

4. Add a no-`backdrop-filter` fallback so the header never falls below 96% effective opacity in Firefox-without-flag or any other unsupported environment:
   ```css
   @supports not (backdrop-filter: blur(1px)) {
     .app-topnav { background-color: color-mix(in srgb, var(--nav-bg) 100%, var(--app-bg) 60%); }
   }
   ```
   (The mix lifts the alpha-channel paint to near-opaque by overlaying app-bg.)

### 3.3 Files touched

- `orchestrator/frontend/src/themes/theme-contract.css` — main `.app-topnav` rule + `.skin-glassy` override + `@supports` fallback.
- `orchestrator/frontend/src/themes/midnight.css` — `--nav-bg` alpha 0.9 → 0.94.
- `orchestrator/frontend/src/themes/rainy-day.css` — same.
- `orchestrator/frontend/src/themes/red-wine.css` — same.
- `orchestrator/frontend/src/themes/slate.css` — same.
- `orchestrator/frontend/src/themes/warm-linen.css` — **left alone** (Warm Linen is being redesigned separately, per the brief).

No component file changes needed. No JS / TS changes.

### 3.4 What does NOT change

- `.app-topnav` `box-shadow`, `border-bottom`, `color`, `padding`, `z-index`, layout positioning.
- `AppHeader.tsx` and `PolishGlassLayout.tsx` markup.
- `.speak-chatbar` definition (different surface; will inherit the higher `--nav-bg` per theme but its own `blur(18px)` stays — that's a Speak concern).
- `MusicPG`'s sub-header (inherits the new `--nav-bg`; its own `backdrop-blur-md` stays — fine, it's stacked under the main nav).

---

## 4. Verification plan

After applying:

1. Visit `/dashboard`, `/decks`, `/generate`, `/study`, `/music`, `/speak` in **both** skins.
2. For each, scroll content with high-contrast imagery (album art on Music, deck cover images on Decks/DeckView) so it passes under the header.
3. Confirm: bright imagery does not visibly read through the header — only a soft ambient hue cast. Text behind the header is never legible.
4. Repeat at mobile viewport (375×812) — header retains presence; mobile menu sheet (also `.app-topnav`) gets the same treatment.
5. Toggle theme dropdown across midnight, rainy-day, red-wine, slate. Verify each theme's `--nav-bg` produces an appropriate dark frosted surface.
6. Spot-check Warm Linen — it's not in scope but it should not have regressed (alpha unchanged at 0.92).
