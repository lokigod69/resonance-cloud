# Investigation Report: Dashboard Redesign & i18n Audit (Session A)

**Investigator:** Antigravity  
**Date:** 2026-04-17  
**Branch:** Working tree (no `.git` found at repo root — this is a working copy, not a git repo)  
**Frontend path:** `orchestrator/frontend/` (NOT `frontend/` as stated in the prompt — see discrepancy note below)

> **IMPORTANT — Discrepancy with prompt:** The prompt states `Scope directory: frontend/`. No `frontend/` directory exists at the repo root. The actual frontend code lives at `orchestrator/frontend/`. All paths in this report are relative to the repo root (`d:\CODING\ResonanceTEST\`). The `_spotcheck/`, `_review/`, and `_review_async/` directories contain stale copies; this report references only the primary source at `orchestrator/frontend/`.

---

## Section 1 — i18n Infrastructure

### 1.1 What i18n system is in use?

**Custom.** There is no i18next, react-intl, or third-party i18n library. The system consists of:

1. **`orchestrator/frontend/src/lib/translations.ts`** — A single TypeScript file containing a `translations` object keyed by locale (`en`, `de`, `fr`), each mapping string keys to translated strings. Also exports a `createT()` factory function that returns a `t(key, vars?)` closure.
2. **`orchestrator/frontend/src/hooks/useTranslation.ts`** — A React hook that reads the user's `base_language` from `useAuth().profile`, maps it to a locale via `LANGUAGE_TO_LOCALE`, and returns memoized `t()` and `tp()` (plural) functions.

The system uses `{variableName}` interpolation syntax (custom regex replacement, not ICU MessageFormat).

### 1.2 Translation dictionary locations

| File | Languages | Approx. key count per locale |
|------|-----------|------------------------------|
| `orchestrator/frontend/src/lib/translations.ts` (lines 40–1042) | `en`, `de`, `fr` | EN: ~215, DE: ~215, FR: ~215 |

This is the **only** translation file. There are no separate JSON files, no per-locale files, no lazy-loaded bundles. Everything is in a single 1043-line TypeScript file.

A second hook `orchestrator/frontend/src/hooks/useLandingLocale.ts` exists for the landing page, but it also imports `createT` from the same `translations.ts`.

### 1.3 How is the UI language selected and persisted?

**Selection chain:**
1. User's `base_language` is stored in the Supabase `profiles` table (e.g., `"German"`, `"French"`, `"English"`, `"Korean"`)
2. `useAuth()` hook fetches the profile -> `profile.base_language`
3. `useTranslation()` reads `profile.base_language` and maps it through `LANGUAGE_TO_LOCALE` (line 19–25 of `translations.ts`):
   - `"English"` -> `'en'`
   - `"German"` -> `'de'`
   - `"French"` -> `'fr'`
   - `"Korean"` -> `'en'` (intentional fallback)
   - `"Spanish"` -> `'en'` (intentional fallback)
   - Any missing key -> `'en'` (default via `?? 'en'` at `useTranslation.ts:19`)
4. The locale is **not persisted in localStorage or URL**. It is derived live from the profile on every render.

**Reading component:** `useTranslation()` at `orchestrator/frontend/src/hooks/useTranslation.ts:17–37`

### 1.4 Fallback behavior

**Verified from source** (`translations.ts:30`):

```typescript
let str = translations[locale]?.[key] ?? translations.en?.[key] ?? key;
```

Fallback chain:
1. Look up key in the active locale's dictionary
2. If missing -> look up key in the `en` dictionary
3. If also missing -> return the **raw key string** (e.g., `"dashboard.someNewKey"`)

This means a missing French key yields the English value, and a completely unknown key yields the key itself as visible UI text.

### 1.5 Every hardcoded English string on the Dashboard page

#### Dashboard.tsx (Classic) — `orchestrator/frontend/src/pages/Dashboard.tsx`

| Line | String | Wired to translation key? | Also used elsewhere? |
|------|--------|---------------------------|---------------------|
| 54 | `'Dashboard'` (nav label in `AppHeader.tsx:54`) | **NO** — hardcoded as `label: 'Dashboard'` | Also hardcoded in `PolishGlassLayout.tsx:26` |
| 199–203 | Welcome greeting | YES `dashboard.welcomeUser` / `dashboard.welcome` | — |
| 210 | "Level" label | YES `dashboard.level` | — |
| 241 | `` `${libraryWords.length} words in ${getLanguageName(activeLanguage)}` `` | **NO** — hardcoded template string | Same pattern in `DashboardPG.tsx:243` |
| 257 | `` `No words yet in ${activeLanguage}. Generate some!` `` | **NO** — hardcoded string passed as `emptyMessage` prop | Same in `DashboardPG.tsx:259` |
| 258 | `'No words yet.'` | **NO** — hardcoded | Same in `DashboardPG.tsx:260` |
| 271 | `"Generate New Words"` | **NO** — hardcoded JSX text | Also in `DashboardPG.tsx:271`, `Decks.tsx:226` |
| 291 | `"Your vocabulary awaits"` | **NO** — hardcoded | Same in `DashboardPG.tsx:290` |
| 292 | `"Generate your first words to begin"` | **NO** — hardcoded | Same in `DashboardPG.tsx:291` |
| 297 | `"Generate First Words"` | **NO** — hardcoded button label | Same in `DashboardPG.tsx:296` |
| 305 | Quote text (from `QUOTES` array) | **NO** — hardcoded English array, no translation key | Same in `DashboardPG.tsx:304` |

#### WordLibrary.tsx — `orchestrator/frontend/src/components/dashboard/WordLibrary.tsx`

| Line | String | Wired to translation key? | Also used elsewhere? |
|------|--------|---------------------------|---------------------|
| 49–56 | Filter labels: `'all'`, `'words'`, `'phrases'` (rendered with `capitalize` CSS) | **NO** — hardcoded array values, rendered directly with CSS capitalize | Used only in Dashboard (Classic + PG) |
| 61–63 | Sort labels: `'Recent'`, `'A-Z'`, `'Z-A'` | **NO** — hardcoded strings in tuple array | Used only in Dashboard |
| 83 | `'No words to show.'` default fallback | **NO** — hardcoded default prop value | — |

#### AppHeader.tsx (nav bar) — `orchestrator/frontend/src/components/layout/AppHeader.tsx`

| Line | String | Wired to translation key? | Notes |
|------|--------|---------------------------|-------|
| 54 | `'Dashboard'` | **NO** — hardcoded while all other nav items use `t()` | Missing `nav.dashboard` key in all locales |
| 55 | `t('nav.decks')` -> "Decks" | YES | DE: "Decks", FR: "Decks" |
| 56 | `t('nav.generate')` -> "Generate" | YES | DE: "Erstellen", FR: "Creer" |
| 57 | `t('nav.study')` -> "Study" | YES | DE: "Lernen", FR: "Etudier" |
| 58 | `t('nav.music')` -> "Music" | YES | DE: "Musik", FR: "Musique" |
| 59 | `t('nav.speak')` -> "Speak" | YES | DE: "Sprechen", FR: "Parler" |

> **NOTE:** The prompt refers to nav items "Dashboard / Decks / Erstellen / Lernen / Musik / Sprechen" — this is the **German** UI rendering. "Dashboard" stays English because it's hardcoded. The other five are correctly translated via `t()`. This matches the code.

#### PolishGlassLayout.tsx (Glassy nav bar) — `orchestrator/frontend/src/components/layout/PolishGlassLayout.tsx`

| Line | String | Wired to translation key? |
|------|--------|---------------------------|
| 26 | `'Dashboard'` | **NO** — same hardcoded pattern as Classic |

#### Decks.tsx (Classic Decks page, NOT Dashboard but contains Generate button)

| Line | String | Wired to translation key? |
|------|--------|---------------------------|
| 196 | `"Your Decks"` | **NO** — hardcoded |
| 226 | `"Generate New Words"` | **NO** — hardcoded |

### 1.6 Missing translation keys in DE/FR/EN

The following keys are **needed but do not exist** in any locale:

| Required Key | EN value (proposed) | Present in DE? | Present in FR? |
|-------------|---------------------|----------------|----------------|
| `nav.dashboard` | "Dashboard" | NO | NO |
| `dashboard.wordsInLanguage` | "{count} words in {language}" | NO | NO |
| `dashboard.noWordsInLanguage` | "No words yet in {language}. Generate some!" | NO | NO |
| `dashboard.noWordsYet` | "No words yet." | NO | NO |
| `dashboard.generateNewWords` (or reuse `dashboard.generate`) | "Generate" / "Generate New Words" | NO (but `dashboard.generate` exists as "Erstellen") | NO (but `dashboard.generate` exists as "Creer") |
| `dashboard.vocabularyAwaits` | "Your vocabulary awaits" | NO | NO |
| `dashboard.generateFirstHint` | "Generate your first words to begin" | NO | NO |
| `dashboard.generateFirstWords` | "Generate First Words" | NO | NO |
| `wordLibrary.all` | "All" | NO | NO |
| `wordLibrary.words` | "Words" | NO | NO |
| `wordLibrary.phrases` | "Phrases" | NO | NO |
| `wordLibrary.recent` | "Recent" | NO | NO |
| `wordLibrary.az` | "A-Z" | NO | NO |
| `wordLibrary.za` | "Z-A" | NO | NO |
| `wordLibrary.noWords` | "No words to show." | NO | NO |
| Quote strings (61 quotes) | (see Section 5) | NO | NO |

**Summary:** Of all strings visible on the Dashboard page, approximately **15 unique strings + 61 quotes** are hardcoded English with no translation key. The greeting, level, and nav labels (except "Dashboard") are properly wired.

---

## Section 2 — Header (Top Nav) Stickiness

### 2.1 What component renders the top nav?

- **Classic skin:** `orchestrator/frontend/src/components/layout/AppHeader.tsx` (the `AppHeader` component)
- **Glassy skin:** `orchestrator/frontend/src/components/layout/PolishGlassLayout.tsx` (nav is inline in the layout component, lines 45–120)

### 2.2 Is the header rendered once in a layout wrapper, or independently?

**Layout wrapper pattern — once per skin:**

- **Classic:** `AppLayout.tsx` renders `<AppHeader />` once, then `<Outlet />` for page content. Confirmed at `orchestrator/frontend/src/components/layout/AppLayout.tsx:4–13`.
- **Glassy:** `PolishGlassLayout.tsx` renders the nav inline (not a separate component), then `<Outlet />`. Confirmed at `orchestrator/frontend/src/components/layout/PolishGlassLayout.tsx:37–173`.

The header is **not** rendered independently inside each page. It's in the layout wrapper only.

### 2.3 Current CSS position behavior

**Classic skin (`AppHeader.tsx`):**

```html
<header className="flex items-center border-b border-border px-4 md:px-6 py-2 bg-background gap-2">
```

- **No `position` class at all.** This means it defaults to `position: static`.
- It is **not sticky** and **not fixed**. It scrolls away with the page content.
- The `<main>` in `AppLayout.tsx` has `className="flex-1 p-6"` — standard flow layout.

**Glassy skin (`PolishGlassLayout.tsx`):**

```html
<nav className="fixed top-0 left-0 w-full px-4 sm:px-6 py-2 flex items-center z-50 pointer-events-auto bg-[#0a0a0c]/80 backdrop-blur-md">
```

- **`position: fixed`, `top: 0`, `z-index: 50`** — the Glassy nav is already fixed/sticky.
- The `<main>` has `className="w-full min-h-screen pt-16 sm:pt-20 pb-20 relative z-10"` — padding-top compensates for the fixed nav.

### 2.4 Z-index analysis

**Classic skin:**
- `AppHeader`: No z-index set (effectively `auto` / `0` since `position: static`).
- `body::before` noise overlay: `z-index: 9999` (but `pointer-events: none`, purely decorative).
- Any modals/dropdowns from shadcn/ui: Typically `z-50` from Radix portals.
- The language toggle on Dashboard: `className="sticky top-16 z-10"` — uses `z-10`.

**When making Classic header sticky, recommended z-index:** `z-40` or `z-50` to sit below modal overlays but above page content. The language toggle's `top-16` value currently assumes 64px header height — this should still work if the header is made sticky since `top-16` is relative to the viewport with `position: sticky`.

**Glassy skin:**
- Nav: `z-50`
- Dot grid: `z-1` (fixed)
- Mobile menu overlay: `z-40`
- Page content: `z-10`
- No stacking conflicts observed.

### 2.5 Mobile view — same or separate nav?

**Classic skin:** Same `AppHeader` component for both desktop and mobile. Mobile gets a hamburger Sheet sidebar (lines 73–130 of `AppHeader.tsx`), desktop gets the centered horizontal nav (lines 139–184). Both are in the same `<header>` element.

**Glassy skin:** Same `PolishGlassLayout` component handles both. Mobile gets a hamburger + animated slide-down (lines 123–163), desktop gets centered nav (lines 73–101). Both are in the same `<nav>` element.

There is **no separate mobile header file**.

### 2.6 Scroll-triggered behavior?

**None.** There is no hide-on-scroll, shrink-on-scroll, or any scroll listener attached to the header in either skin. The Classic header is plain static; the Glassy header is plain fixed.

---

## Section 3 — Dashboard Layout Structure

### 3.1 Dashboard page component file path

- **Classic:** `orchestrator/frontend/src/pages/Dashboard.tsx`
- **Glassy (PG):** `orchestrator/frontend/src/pages/DashboardPG.tsx`

### 3.2 DOM/JSX structure (Classic Dashboard, top to bottom)

```
<div className="classic-dashboard-wrapper w-full max-w-full overflow-x-hidden">
  <div className="classic-aurora" />                          <- decorative aurora bg
  <div className="max-w-4xl mx-auto px-4 sm:px-6">          <- content container
    <div className="classic-dashboard-header">                <- greeting
      <h1>Welcome, {name}</h1>
    </div>
    
    {/* Level display */}
    <div className="flex items-center justify-center gap-3 mb-6">
      <span>Level</span>
      <LevelBadge />
    </div>
    
    {/* Language toggle pills */}
    <div className="sticky top-16 z-10 mb-3 flex justify-center px-1 py-2">
      <div className="inline-flex ... rounded-2xl border ... bg-card/80 px-3 py-3 ...">
        <-- OUTER CONTAINER (the box to remove) -->
        <button>English</button>
        <button>Indonesian</button>
        <button>Bisaya</button>
      </div>
    </div>
    
    {/* Word count line */}
    <p>X words in English</p>
    
    {/* Word library (filter tabs + sort buttons + word grid) */}
    <div className="mb-4">
      <WordLibrary ... />
    </div>
    
    {/* Generate button */}
    <div className="mt-8 flex justify-center">
      <button>Generate New Words</button>
    </div>
    
    {/* Quote */}
    <div className="mt-12 mb-8 text-center max-w-2xl mx-auto px-4">
      <div className="bg-card/80 border border-border/50 rounded-xl p-6">
        <p>"{quote}"</p>
      </div>
    </div>
  </div>
  
  <WordDetailModal ... />
</div>
```

**Outer container CSS (`classic-dashboard-wrapper` from `index.css:184-189`):**
- `position: relative`
- `min-height: calc(100vh - 80px)`
- `overflow-y: auto`
- `color: white`

The layout is **not** using flex-direction column at the wrapper level. The content flows naturally with block layout inside the `max-w-4xl` container.

### 3.3 Quote push-to-bottom compatibility

**Current state:** The quote sits at `<div className="mt-12 mb-8 ...">` — it's just a block element with a top margin. When content is short, the quote floats mid-page. When content is long, it flows below.

**For the "push to bottom" pattern** (`flex-direction: column` + `margin-top: auto` on the quote):

The outer wrapper `.classic-dashboard-wrapper` already has `min-height: calc(100vh - 80px)`, but it does **not** have `display: flex` or `flex-direction: column`. The inner `max-w-4xl mx-auto` container is also not a flex column.

**What fights it:**
1. The `classic-aurora` div is `position: absolute; inset: 0` — this won't participate in flex anyway, so no conflict.
2. The `overflow-y: auto` on the wrapper could conflict with `min-height` behavior in some browsers but generally works.
3. The `max-w-4xl mx-auto` container would need to be the flex column with `flex: 1`, and the quote would need `margin-top: auto` applied to it.

**Verdict:** The layout is compatible with the pattern. Changes needed:
- Add `display: flex; flex-direction: column` to `.classic-dashboard-wrapper`
- Add `flex: 1` to the `max-w-4xl` container
- Make the `max-w-4xl` container itself a flex column
- Add `margin-top: auto` to the quote container

No fixed heights or nested flex layouts would fight this.

### 3.4 Language toggle pills

**Component rendering them:** Inline JSX in `Dashboard.tsx:215–236` (not a separate component).

**Outer container (the box to remove):**
```tsx
// Dashboard.tsx line 217
<div className="inline-flex w-fit max-w-full flex-wrap justify-center gap-2 rounded-2xl border border-border/50 bg-card/80 px-3 py-3 shadow-sm backdrop-blur-sm">
```

**CSS classes on the outer container:**
- `inline-flex` — inline flex layout
- `w-fit max-w-full` — shrink to content but cap at viewport
- `flex-wrap justify-center gap-2` — wrapping centered pills
- `rounded-2xl` — rounded corners (the visible box border radius)
- `border border-border/50` — visible border (the visible box border)
- `bg-card/80` — visible background (the visible box fill)
- `px-3 py-3` — padding
- `shadow-sm` — subtle shadow
- `backdrop-blur-sm` — glassmorphism

**To remove the outer container:** Strip `rounded-2xl`, `border`, `bg-card/80`, `shadow-sm`, `backdrop-blur-sm`, and reduce padding. Keep `inline-flex`, `flex-wrap`, `justify-center`, `gap-2` so the pills still flow correctly.

**Same pattern used elsewhere?** The Glassy Dashboard (`DashboardPG.tsx:219`) uses a similar wrapper:
```tsx
<div className="pg-glass inline-flex w-fit max-w-full flex-wrap justify-center gap-2 rounded-2xl px-3 py-3">
```
The `Decks.tsx:200` language toggle does **not** use this box container pattern — it uses a plain `flex gap-2 mb-6 overflow-x-auto` wrapper without the bordered box.

### 3.5 "Generate New Words" button

- **File:** `orchestrator/frontend/src/pages/Dashboard.tsx:265–273`
- **Label source:** Hardcoded JSX text: `Generate New Words` (line 271)
- **onClick:** `() => navigate('/generate')` — navigates to the Generate page. No other side effects.
- **Translation key exists but is NOT wired:** `dashboard.generate` key exists (EN: "Generate", DE: "Erstellen", FR: "Creer") but the button doesn't use it.

---

## Section 4 — Classic vs Glassy Divergence

### 4.1 How is the skin selected?

**Separate component trees via route-level conditional rendering.**

- `SkinContext.tsx` provides `skin` state (`'classic' | 'glassy'`) persisted in `localStorage` under key `'resonance-skin'`.
- In `App.tsx:129–155`, the routing renders completely different component sets based on `skin`:
  - `skin === 'glassy'` -> `PolishGlassLayout` + `DashboardPG`, `DecksPG`, `DeckViewPG`, etc.
  - else -> `AppLayout` + `Dashboard`, `Decks`, `DeckView`, etc.
- Additionally, `skin === 'glassy'` adds the `skin-glassy` class to `<html>`, which activates CSS overrides in `index.css`.

This is a **separate component tree** approach, not a theme provider or CSS variable switch.

### 4.2 Issue comparison per concern

| Concern | Classic | Glassy | Same issue? |
|---------|---------|--------|-------------|
| **Sticky header** | NOT sticky (`position: static`) | Already fixed (`position: fixed; top: 0; z-50`) | **Different** — Classic needs fix, Glassy is already correct |
| **Quote position** | Floats mid-page (same `mt-12 mb-8` block layout) | Same issue — identical code at `DashboardPG.tsx:302–306` | **Same issue** |
| **Language pill container box** | Has bordered box (`bg-card/80 border rounded-2xl shadow-sm backdrop-blur-sm`) | Has `pg-glass` box (`pg-glass rounded-2xl`) at line 219 | **Same issue**, different CSS classes |
| **Generate button label** | Hardcoded "Generate New Words" (line 271) | Hardcoded "Generate New Words" with prefix char (line 271) | **Same issue** (Glassy also has a special prefix character) |
| **i18n coverage** | Missing keys (see 1.5) | Same missing keys — `DashboardPG.tsx` has identical hardcoded strings | **Same issue** — both use `useTranslation()` and share `WordLibrary`, but hardcoded strings are duplicated |

### 4.3 Glassy-specific file paths

| Component | Classic path | Glassy path |
|-----------|-------------|-------------|
| Dashboard page | `pages/Dashboard.tsx` | `pages/DashboardPG.tsx` |
| Layout/nav | `components/layout/AppLayout.tsx` + `AppHeader.tsx` | `components/layout/PolishGlassLayout.tsx` |
| WordLibrary | `components/dashboard/WordLibrary.tsx` (shared) | Same (shared) |

---

## Section 5 — Confucius Quote

### 5.1 Where does the quote string live?

**Hardcoded English array** at `orchestrator/frontend/src/data/quotes.ts`.

The file exports `QUOTES: string[]` — an array of 61 motivational/language-learning quotes with attributions. Despite the prompt calling it "the Confucius quote," only 3 of the 61 quotes are by Confucius:
- Line 23: `"Words are the voice of the heart. — Confucius"`
- Line 24: `"In language, clarity is everything. — Confucius"`
- Line 32: `"It does not matter how slowly you go as long as you do not stop. — Confucius"`

The other 58 quotes are from various authors (Wittgenstein, Fellini, Mandela, Goethe, etc.) or "Unknown."

### 5.2 Rotation/randomization mechanism

**Random pick on mount, stable for the session:**

```typescript
// Dashboard.tsx:142
const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])
```

- `useMemo` with `[]` dependency = picked once on component mount, stable for the lifetime of the component.
- If the user navigates away and back, a new random quote is picked (component remounts).
- There is no daily rotation, no user-preference, no sequential cycling.

### 5.3 Translations of quotes

**None.** The `QUOTES` array is plain English strings. There are no translation keys for quotes in the `en`, `de`, or `fr` dictionaries. The quote is rendered raw:

```tsx
<p className="...">{quote}</p>  // not wrapped in t()
```

Translating 61 quotes into DE and FR would be a significant content effort. The implementation prompt should decide whether to:
1. Translate all 61 quotes (expensive but complete)
2. Show quotes only in English regardless of UI language (simplest)
3. Translate a small subset and rotate only translated ones when locale != EN

---

## Section 6 — Risk & Scope Flags

### 6.1 Shared components affected beyond Dashboard

| Component | Used by | Impact |
|-----------|---------|--------|
| **`WordLibrary.tsx`** | `Dashboard.tsx`, `DashboardPG.tsx` (only these two) | Safe to modify — only impacts Dashboard pages |
| **`AppHeader.tsx`** | All Classic-skin pages (via `AppLayout`) | Making it sticky affects **every** Classic page, which is likely desired but should be verified |
| **`PolishGlassLayout.tsx`** | All Glassy-skin pages | Already sticky; any changes here affect all Glassy pages |
| **`translations.ts`** | Every component that calls `useTranslation()` | Adding keys is safe (additive only); renaming keys would break other consumers |
| **`quotes.ts`** | `Dashboard.tsx`, `DashboardPG.tsx` | Only used on Dashboard pages |
| **`Decks.tsx`** | Classic Decks page | Also has hardcoded "Generate New Words" (line 226) and "Your Decks" (line 196) — should these be fixed too? |
| **`DecksPG.tsx`** | Glassy Decks page | Also has "Your Decks" (line 212) hardcoded |

> **WARNING:** The "Generate New Words" button appears in **three** files: `Dashboard.tsx:271`, `DashboardPG.tsx:271`, and `Decks.tsx:226`. If the implementation prompt only fixes Dashboard, the Decks page will still show the English string.

### 6.2 Tests

**No tests found.** There are:
- No `*.test.*` or `*.spec.*` files anywhere under `orchestrator/frontend/`.
- No `__tests__` directories.
- No test configuration in `package.json` (verified: no `vitest`, `jest`, or `@testing-library` in dependencies).
- No e2e test directory (no `cypress`, `playwright`, etc.).

**Risk:** Zero test coverage means any i18n or layout change relies entirely on manual verification.

### 6.3 Recent commits / in-flight branches

**Cannot verify.** The working directory at `d:\CODING\ResonanceTEST\` is **not a git repository** — `git` commands fail with `fatal: not a git repository`. This appears to be a working copy extracted or synced separately from git.

**Risk:** Without git history, we cannot check for in-flight branches or recent commits touching these files. The `_review/`, `_review_async/`, and `_spotcheck/` directories at the repo root suggest there are stale copies of the frontend that may or may not reflect the current state.

---

## Summary

### Top 3 Risks / Unknowns

1. **No git history available.** We cannot verify whether other branches are modifying the same files. If this working copy diverges from the canonical repo, the implementation prompt could produce conflicting changes. **Mitigation:** Sir Robert should confirm which files are currently being touched in other branches before implementation begins.

2. **WordLibrary hardcoded strings affect both skins and potentially the Decks page.** The filter tabs ("All", "Words", "Phrases") and sort buttons ("Recent", "A-Z", "Z-A") are hardcoded in `WordLibrary.tsx`, which is shared by Classic and Glassy Dashboards. The "Generate New Words" label is independently hardcoded in three files. Missing any one creates an inconsistent bilingual UI. **Mitigation:** The implementation prompt should explicitly list all files requiring string changes.

3. **61 quotes have no translations and no translation keys.** Translating the quote corpus into DE and FR is a significant content task that may block the i18n work if treated as a requirement. **Mitigation:** Sir Robert should decide the quote translation strategy before implementation.

### Scope the implementation prompt should exclude

- **Do not refactor the i18n system itself.** The custom `t()` / `createT()` pattern works correctly. Just add missing keys.
- **Do not deeply modify the Glassy skin layout.** The Glassy nav is already `position: fixed`. Quote push-to-bottom and language pill box removal can be addressed in a follow-up.
- **Do not translate the 61 quotes** unless Sir Robert explicitly requests it — this is a content decision, not a code decision.
- **Do not modify `AppSidebar.tsx`.** It's an older component that appears unused in the current routing (the routes use `AppLayout` which only renders `AppHeader`, not `AppSidebar`). Its hardcoded labels are a separate concern.

### Questions for Sir Robert

1. **Should the "Dashboard" nav label be translated?** It's currently hardcoded as English in both `AppHeader.tsx` and `PolishGlassLayout.tsx`. If yes, what should it be in DE and FR? (Suggestion: DE: "Uebersicht", FR: "Tableau de bord")

2. **Should the Decks page also get the "Generate" button label fix and i18n updates?** It has the same hardcoded "Generate New Words" string and a hardcoded "Your Decks" title.

3. **Quote translation strategy:** (a) Keep quotes English-only for all locales, (b) translate all 61 into DE/FR, or (c) translate a representative subset?

4. **Should the Glassy skin get the same fixes (quote position, pill container, button label) in the same implementation prompt, or should it be a separate follow-up?** The code is highly parallel between `Dashboard.tsx` and `DashboardPG.tsx`, so doing both simultaneously is low-risk.

5. **The `getLanguageName()` utility returns English names for languages (e.g., "German", "Indonesian").** The "X words in German" line uses this. Should language names be localized per UI language (e.g., "5 Woerter auf Deutsch" vs "5 words in German")? The `langName.*` translation keys already exist in all three locales — the word count line just doesn't use them.
