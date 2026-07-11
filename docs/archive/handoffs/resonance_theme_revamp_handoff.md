# Resonance Front-End Theme Revamp — Session Handoff

**Date:** 2026-04-26  
**Project:** `lokigod69/resonance-cloud` / Resonance front end  
**Current working branch:** `main`  
**Current dev server URL used during review:** `http://127.0.0.1:5177/`  
**Important user workflow preference:** do **not** use review branches unless explicitly requested. Work on `main` / the normal app branch, commit, push, then restart the local dev server and report the exact URL.

---

## 1. Executive summary

This session was a front-end/theme-system revamp for Resonance. The original issue was that the app’s themes did not translate consistently across skins or pages:

- Glassy skin barely respected themes.
- Classic skin respected themes too aggressively, often becoming monochrome.
- Warm Linen looked like isolated white panels over a dark app.
- Profile/Credits/Music/Speak/Decks/Generate had inconsistent hardcoded colors.
- Blue/red/white modes felt cheap rather than designed.
- Theme swatches in Profile were too visually noisy.
- The user wanted modern, coherent theme behavior without changing functionality.

The final accepted baseline after V6:

- **Rainy Day is now the default theme.**
- **Deep Blue is removed from selectable themes.**
- Legacy `deep-blue` still maps to **Midnight**, not Rainy Day.
- Profile theme order is now: **Rainy Day, Midnight, Red Wine, Slate, Warm Linen**.
- Classic keeps its two-halo atmospheric look, with reduced intensity.
- Glassy no longer has the big centered halo or the global horizontal horizon line.
- Warm Linen contrast is improved for Profile, Study, Music thumbnails/orbs, and Speak/Grok cards.
- We stopped after V6 and accepted this as the new theme baseline.

The next work should not reopen global theme churn. Any future issues should be handled page-by-page by the relevant feature agent.

---

## 2. Current accepted design direction

### Theme = mood palette. Skin = rendering style.

The core design rule used throughout the revamp:

- Theme controls mood: Rainy Day, Midnight, Red Wine, Slate, Warm Linen.
- Skin controls rendering style: Classic vs Glassy.
- Classic can be more atmospheric and visible.
- Glassy should be more subtle, using theme color mainly in:
  - active nav items
  - borders
  - chips
  - focus rings
  - card highlights
  - low-opacity haze
  - small glows

### Current theme roles

#### Rainy Day
Now the **default**.  
Soft rainy blue-gray. Calm, readable, less harsh than the removed Deep Blue.

#### Midnight
Second option.  
Graphite / near-black with restrained sea-glass / aquamarine energy. It should not read as bright cyan/green or purple.

#### Red Wine
Dark burgundy / black cherry. Mostly accepted. It should not become a neon red spotlight.

#### Slate
Calm, premium neutral gray/brown. The user liked this mode and it should remain mostly untouched.

#### Warm Linen
Light mode. Warm paper / cream / linen, espresso text, taupe accent. It should be readable and not foggy or white-on-white.

#### Deep Blue
Removed from selectable themes. Legacy values are handled for safety.

---

## 3. Final user preference / stop condition

The user explicitly decided to stop global theme work after V6. The final ask was to create this handoff document.

Current stance:

- V6 is “good enough” as the front-end theme baseline.
- Do not continue trying to perfect the global Glassy room/grid background.
- Do not reintroduce Deep Blue.
- Do not reopen the full theme system unless the user explicitly asks.
- If future polish is needed, handle it surgically per page.

---

## 4. Commit timeline

### V1 — Semantic theme contract foundation

**Commit:** `fa9f52c586f18feba1cd25cec4c8faee812d41d4`  
**Initial location:** `origin/theme-revamp-v1-contract` review branch  
**Status:** Foundation work later superseded/evolved by main commits.

Main work:
- Added semantic contract: `theme-contract.css`.
- Imported it in `main.tsx`.
- Updated `SkinContext.tsx` to apply:
  - `data-skin`
  - `skin-classic`
  - `skin-glassy`
- Reworked six theme CSS files to assign semantic mood variables.
- Rethemed shared/layout surfaces:
  - `AppLayout`
  - `AppHeader`
  - `PolishGlassLayout`
  - dialogs
  - Profile/Credits
  - Dashboard/WordLibrary
- Rethemed visible Glassy pages:
  - MusicPG
  - DecksPG
  - GenerateGO
  - Speak
- Aliased old PG/GO variables to the new semantic contract.

Verification reported:
- `npm run build` passed.
- `git diff --check -- frontend/src` passed.
- `npm run lint` failed due to existing repo-wide lint debt, not this styling pass.

V1 changed 22 files:
- `frontend/src/components/ProfileModal.tsx`
- `frontend/src/components/RedeemCodeDialog.tsx`
- `frontend/src/components/dashboard/WordLibrary.tsx`
- `frontend/src/components/layout/AppHeader.tsx`
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/layout/PolishGlassLayout.tsx`
- `frontend/src/contexts/SkinContext.tsx`
- `frontend/src/index.css`
- `frontend/src/main.tsx`
- `frontend/src/pages/DashboardPG.tsx`
- `frontend/src/pages/DecksPG.tsx`
- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/pages/MusicPG.tsx`
- `frontend/src/pages/Speak.tsx`
- `frontend/src/themes/deep-blue.css`
- `frontend/src/themes/glass-orb.css`
- `frontend/src/themes/midnight.css`
- `frontend/src/themes/rainy-day.css`
- `frontend/src/themes/red-wine.css`
- `frontend/src/themes/slate.css`
- `frontend/src/themes/theme-contract.css`
- `frontend/src/themes/warm-linen.css`

Important workflow lesson:
- The user rejected review-branch workflow. Future agents should work on `main` unless told otherwise.

---

### V2 — Palette correction and Deep Blue removal

**Commit:** `7c7f5fa`  
**Message:** `Polish theme palettes and simplify theme selection`  
**Branch:** `main`

Main work:
- Removed Deep Blue from the selectable theme system.
- Deleted `frontend/src/themes/deep-blue.css`.
- Removed the Deep Blue import from `main.tsx`.
- Added legacy migration for old `deep-blue` values.
- Retuned Midnight away from purple.
- Softened Rainy Day and Red Wine.
- Preserved Slate mostly as-is.
- Strengthened Warm Linen contrast and reduced image washout.
- Made top nav more opaque with a subtle shadow.
- Simplified Profile swatches to one gradient square plus one accent dot.

Verification reported:
- Build passed.
- Diff check passed.
- Lint still failed due to pre-existing repo-wide debt.

User reaction:
- V2 improved some things but made Midnight feel too cyan/green.
- Glassy had one big centered halo.
- Classic was later judged good structurally, but sometimes too intense.
- The Profile swatches were improved.

---

### V3 — Remove centered Glassy halo / add early atmosphere

**Commit:** `ec11fdf`  
**Message:** `Refine glassy background atmosphere and warm linen contrast`  
**Branch:** `main`

Main work:
- Removed the centered Glassy ambient halo from `PolishGlassLayout`.
- Replaced Glassy shell glow with static CSS pseudo-element room/floor-grid atmosphere.
- Kept Classic shell behavior intact.
- Changed legacy `deep-blue` migration from Rainy Day to Midnight.
- Added Warm Linen Glassy overrides for Generate surfaces/text.

Changed files:
- `frontend/src/components/layout/PolishGlassLayout.tsx`
- `frontend/src/contexts/ThemeContext.tsx`
- `frontend/src/themes/theme-contract.css`

Verification:
- Build passed.
- Diff check passed.
- Dev server ran on `http://127.0.0.1:5177`.

User reaction:
- V3 reduced the harsh halo and was easier on the eyes.
- The intended floor/grid depth was not reliably visible.
- The grid/pattern appeared more on Speak than Dashboard, likely due to layering.

---

### V4 — Explicit Glassy atmosphere layers

**Commit:** `4c7473eba5c8e23ff93bdfb4d6bd90d102c80a0e`  
**Message:** `Expose glassy room atmosphere across pages`  
**Branch:** `main`

Main work:
- Replaced fragile pseudo-element background with explicit fixed layers inside `PolishGlassLayout`:
  - haze
  - horizon
  - floor
  - vignette
- Kept nav/content above background with existing z-index.
- Added Warm Linen-specific lighter atmosphere treatment.
- Neutralized duplicate `.pg-dot-grid`.
- Made `.skin-glassy .speak-chat-shell` transparent so it did not cover the shared background.
- Rebasing note: preserved newer remote Speak scroll fix.

Changed files:
- `frontend/src/components/layout/PolishGlassLayout.tsx`
- `frontend/src/themes/theme-contract.css`

Investigation findings from agent:
- `.skin-glassy .app-shell::after` existed but was buried by low opacity, masking, low position, `main z-10`, and page-level backgrounds.
- Floor grid was too low/faint.
- Speak showed more pattern due to page-specific layers and scroll/layer interactions.
- `.pg-dot-grid` competed with the room grid.

Verification:
- Build passed.
- Diff check passed.
- Dev server ran.

User reaction:
- V4 added a horizontal line/horizon effect that sometimes looked like a separator but clashed on Dashboard, Generate, and Decks Grid.
- Grid/room effect still did not fully pay off.
- User decided not to keep chasing the grid experiment.

---

### V5 — Calm default theme and remove Glassy horizon artifact

**Commit:** `716fe7b73f323fa34d74e73d5fc9fb0a8b208bb2`  
**Message:** `Calm default theme and remove glassy horizon artifact`  
**Branch:** `main`

Main work:
- **Rainy Day became `DEFAULT_THEME`.**
- No saved theme / invalid saved theme falls back to Rainy Day.
- `standard`, `retro`, and `soft` migrate to Rainy Day.
- Legacy `deep-blue` continues to migrate to Midnight.
- Profile theme order changed to:
  1. Rainy Day
  2. Midnight
  3. Red Wine
  4. Slate
  5. Warm Linen
- Removed shared global `glassy-atmosphere-horizon`.
- Did **not** change `.water-decks-horizon`.
- Muted Midnight and Rainy Day.
- Reduced Classic halo intensity.

Changed files:
- `frontend/src/contexts/ThemeContext.tsx`
- `frontend/src/components/ProfileModal.tsx`
- `frontend/src/components/layout/PolishGlassLayout.tsx`
- `frontend/src/themes/theme-contract.css`
- `frontend/src/themes/midnight.css`
- `frontend/src/themes/rainy-day.css`

Verification:
- Build passed.
- Diff check passed.
- Dev server ran.

User reaction:
- V5 was accepted as the main baseline.
- User considered further inversion/black-hole background but decided to leave it.
- Remaining concerns were small Warm Linen and Speak readability issues.

---

### V6 — Warm Linen contrast and Speak readability polish

**Commit:** `8930bd28fdc30b6bc725d96bdce9c4d826237e42`  
**Message:** `Polish warm linen contrast and speak readability`  
**Branch:** `main`

Main work:
- Warm Linen Profile outline buttons now use stronger warm borders/elevated surface.
- Warm Linen Study cards got `study-mode-card` hook and warmer elevated surface.
- Study card icons/text use semantic theme text tokens in Warm Linen.
- Music orb thumbnails get a tiny saturate/contrast lift and stronger warm border in Warm Linen.
- Warm Linen `speak-glass-card` surfaces now have better separation.
- Speak/Grok card titles use `--text-primary`; helper/descriptions use `--text-secondary`.
- Small white-tinted icon wells in Warm Linen Speak/Study cards are toned into the theme accent instead of pale white.
- Optional Red Wine softening was skipped to keep scope tight.

Changed files:
- `frontend/src/pages/StudyModeSelector.tsx`
- `frontend/src/themes/theme-contract.css`

Verification:
- Build passed.
- Diff check passed.
- Dev server ran.
- Existing untracked screenshot/temp artifacts under `frontend/` were left untouched.

User decision:
- Stop here.
- Create a session handoff document.

---

## 5. Current theme behavior

### Defaults and migrations

Current intended behavior:

- Default theme: `rainy-day`
- No saved theme: `rainy-day`
- Invalid saved theme: `rainy-day`
- Legacy `standard`: `rainy-day`
- Legacy `retro`: `rainy-day`
- Legacy `soft`: `rainy-day`
- Legacy `deep-blue`: `midnight`

Deep Blue is no longer selectable.

### Testing default theme manually

In browser console:

```js
localStorage.removeItem('resonance-theme')
location.reload()
```

Expected: app loads with Rainy Day.

### Testing specific themes manually

```js
localStorage.setItem('resonance-skin', 'glassy')
localStorage.setItem('resonance-theme', 'rainy-day')
location.reload()
```

```js
localStorage.setItem('resonance-skin', 'classic')
localStorage.setItem('resonance-theme', 'midnight')
location.reload()
```

```js
localStorage.setItem('resonance-skin', 'glassy')
localStorage.setItem('resonance-theme', 'red-wine')
location.reload()
```

```js
localStorage.setItem('resonance-skin', 'glassy')
localStorage.setItem('resonance-theme', 'warm-linen')
location.reload()
```

---

## 6. Current architecture

### Main files

Primary theme files:

- `frontend/src/themes/theme-contract.css`
- `frontend/src/themes/midnight.css`
- `frontend/src/themes/rainy-day.css`
- `frontend/src/themes/red-wine.css`
- `frontend/src/themes/slate.css`
- `frontend/src/themes/warm-linen.css`

Theme state:

- `frontend/src/contexts/ThemeContext.tsx`

Skin state:

- `frontend/src/contexts/SkinContext.tsx`

Important layout:

- `frontend/src/components/layout/PolishGlassLayout.tsx`
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/layout/AppHeader.tsx`

Important UI surface changes:

- `frontend/src/components/ProfileModal.tsx`
- `frontend/src/components/RedeemCodeDialog.tsx`
- `frontend/src/components/dashboard/WordLibrary.tsx`
- `frontend/src/pages/DashboardPG.tsx`
- `frontend/src/pages/DecksPG.tsx`
- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/pages/MusicPG.tsx`
- `frontend/src/pages/Speak.tsx`
- `frontend/src/pages/StudyModeSelector.tsx`

### Semantic contract

The CSS contract introduced tokens such as:

- `--app-bg`
- `--app-bg-soft`
- `--app-bg-elevated`
- `--surface-0`
- `--surface-1`
- `--surface-2`
- `--surface-glass`
- `--surface-glass-strong`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--accent`
- `--accent-2`
- `--accent-warm`
- `--accent-soft`
- `--accent-glow`
- `--border-subtle`
- `--border-strong`
- `--field-bg`
- `--field-border`
- `--nav-bg`
- `--shadow-soft`
- `--shadow-elevated`

It also bridges to existing shadcn/Tailwind tokens:

- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--border`
- `--input`
- `--ring`

### PG/GO compatibility aliases

Old Glassy / Generate variables are still aliased into the semantic contract so old page code does not become a second theme system:

- `--pg-base-dark`
- `--pg-glass-panel-bg`
- `--pg-glass-border`
- `--pg-accent-teal`
- `--pg-accent-green`
- `--pg-accent-violet`
- `--pg-accent-rose`
- `--pg-accent-gold`
- `--pg-text-dim`
- `--go-bg-color`
- `--go-glass-bg`
- `--go-glass-border`
- `--go-accent`
- `--go-text-primary`
- `--go-text-secondary`

---

## 7. Current skin behavior

### Classic

Classic is accepted.

Current direction:
- Two off-center halos.
- More visible theme atmosphere than Glassy.
- Reduced intensity after V5.
- Should not be redesigned globally.

If Classic feels too strong in a future review, adjust only halo opacity/intensity. Do not restart the theme system.

### Glassy

Glassy is accepted as calmer after V5.

Current direction:
- No big centered halo.
- No global horizontal horizon line.
- No need to force a visible floor grid.
- Theme should show through active states, borders, chips, focus rings, and subtle atmospheric tint.
- Avoid new global containers or page-wide visual experiments.

The global floor-grid/room experiment was attempted in V3/V4 but was not worth further churn. Do not reopen unless explicitly requested.

---

## 8. What should not be changed casually

Do not casually touch:

- Rainy Day default decision.
- Deep Blue removal.
- Legacy `deep-blue -> midnight` migration.
- Profile theme order.
- Classic/Glassy architecture.
- Decks water mode.
- Decks water ordering/scrolling.
- Speak scroll authority fix.
- Routing/auth/generation/Supabase logic.
- Music player logic.
- Voice tutor behavior.

The user strongly dislikes branch complexity. Future work should be on `main` unless explicitly requested.

---

## 9. Known remaining issues / candidates

These were intentionally left as non-blocking:

### Repo lint
`npm run lint` fails with existing repo-wide lint debt. Do not use that as a blocker for styling-only changes unless the new diff introduces new errors.

### Hardcoded colors
Remaining hardcoded color candidates include:
- status/admin/queue/level colors
- water/specular/glass internal `rgba()` highlights
- old media/player visual fallbacks
- some legacy `text-white`, `bg-white`, `border-white`
- some older purple/indigo decorative classes in non-theme-critical areas

The theme contract and page overrides now handle the main user-facing theme issues. Hardcoded colors should be cleaned only when they appear as visible bugs.

### Warm Linen
V6 improved Warm Linen contrast, but Warm Linen may still need page-specific polish if the user notices a specific screen. Handle surgically.

### Speak/Grok
V6 improved readability. If future issues remain, inspect Grok/VoiceTutor card components directly rather than editing global theme rules.

### Decks water mode
Decks water ordering/scrolling was mentioned as a separate workstream. Do not mix it into theme work.

---

## 10. QA checklist for future reviews

### Default / Rainy Day

```js
localStorage.removeItem('resonance-theme')
location.reload()
```

Check:
- Dashboard
- Decks
- Generate
- Music
- Speak
- Profile
- Credits
- Mobile

Expected:
- calm blue-gray
- no harsh blue-on-blue
- no horizontal Glassy line
- readable cards and nav

### Midnight

```js
localStorage.setItem('resonance-theme', 'midnight')
location.reload()
```

Expected:
- graphite / near-black
- restrained sea-glass energy
- not bright green/cyan
- not purple

### Red Wine

```js
localStorage.setItem('resonance-theme', 'red-wine')
location.reload()
```

Expected:
- dark wine / black cherry
- not neon red
- no bright center spotlight

### Slate

```js
localStorage.setItem('resonance-theme', 'slate')
location.reload()
```

Expected:
- calm premium neutral
- do not overwork it

### Warm Linen

```js
localStorage.setItem('resonance-theme', 'warm-linen')
location.reload()
```

Expected:
- warm paper/linen
- espresso/charcoal text
- no white-on-white
- Profile sign out visible
- Study cards have depth
- Speak/Grok readable
- Music orbs not too foggy

### Skins

```js
localStorage.setItem('resonance-skin', 'classic')
location.reload()
```

```js
localStorage.setItem('resonance-skin', 'glassy')
location.reload()
```

Expected:
- Classic: more atmospheric, two-halo style.
- Glassy: subtler, glass surfaces, no central spotlight, no horizontal line.

---

## 11. Build and run commands

From the correct checkout:

```bash
cd D:\CODING\ResonanceTEST\watery-main\frontend
npm run build
git diff --check -- frontend/src
npm run dev -- --host 127.0.0.1 --port 5177
```

If running from repo root:

```bash
cd frontend
npm run build
git diff --check -- frontend/src
```

Dev server expected:

```text
http://127.0.0.1:5177/
```

Smoke check from agent reports returned HTTP 200.

---

## 12. Future-agent instructions

If another coding agent picks this up, use this as the working agreement:

```text
Work on main, not a review branch.
Do not change app functionality.
Do not touch Supabase, auth, routing, generation, music player, deck logic, or speak logic unless explicitly scoped.
Do not reopen the global theme system.
Rainy Day is the default.
Deep Blue remains removed.
Legacy deep-blue maps to Midnight.
Profile theme order stays Rainy Day, Midnight, Red Wine, Slate, Warm Linen.
Classic and Glassy are accepted as the baseline.
Any future fixes should be page-specific and minimal.
Always run npm run build and git diff --check.
Push to main and restart the dev server.
Report commit hash, build result, changed files, and exact dev URL.
```

---

## 13. Final state

The final accepted theme/frontend baseline is:

- **V6 commit:** `8930bd28fdc30b6bc725d96bdce9c4d826237e42`
- **Branch:** `main`
- **Build:** passed
- **Diff check:** passed
- **Dev server:** `http://127.0.0.1:5177/`
- **Stop condition:** accepted. Do not continue global theme work without a new explicit request.
