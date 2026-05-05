# Classic Header Glass Tier 1 Implementation Report

## Files Changed

- `frontend/src/themes/theme-contract.css`
- `frontend/src/themes/midnight.css`
- `frontend/src/themes/rainy-day.css`
- `frontend/src/themes/red-wine.css`
- `frontend/src/themes/slate.css`
- `frontend/src/themes/warm-linen.css`

## Exact Opacity Changes

- `:root --nav-bg`: `rgba(12, 19, 27, 0.9)` -> `rgba(12, 19, 27, 0.55)`
- `theme-midnight --nav-bg`: `rgba(8, 11, 12, 0.94)` -> `rgba(8, 11, 12, 0.55)`
- `theme-rainy-day --nav-bg`: `rgba(12, 19, 27, 0.94)` -> `rgba(12, 19, 27, 0.55)`
- `theme-red-wine --nav-bg`: `rgba(18, 7, 13, 0.94)` -> `rgba(18, 7, 13, 0.55)`
- `theme-slate --nav-bg`: `rgba(15, 18, 22, 0.94)` -> `rgba(15, 18, 22, 0.55)`
- `theme-warm-linen --nav-bg`: `rgba(246, 240, 231, 0.92)` -> `rgba(246, 240, 231, 0.70)`

## Why AppHeader and AppLayout Were Not Touched

`AppHeader.tsx` and `AppLayout.tsx` already provide the correct classic-shell structure: a sticky `.app-topnav` above a normal scrolling `<main>`. The existing `.app-topnav` rule already applies `backdrop-filter: blur(28px) saturate(1.35)`. The Tier 1 root cause was opacity only, so changing layout or markup would have widened scope without addressing the blocker.

## Build Result

Command: `cd frontend && npm run build`

Result: passed with exit code 0.

Notes: Vite emitted existing bundle-size and dynamic-import warnings; no build errors.

## Diff Check Result

Command: `git diff --check`

Result: passed with exit code 0.

Command: `git diff --name-only`

Result: the wider working tree includes unrelated local edits outside this implementation. Those unrelated files were not touched or staged for this implementation.

Command: `git diff --cached --name-only`

Result: staged files are limited to this report plus the six intended theme files.

## Manual QA Status

Manual browser QA was performed against the local Vite dev server using bundled Playwright because the in-app browser runtime could not initialize with the configured Node version. A local fake Supabase session was used only to reach protected layout routes; route data may not represent a real authenticated account.

Checked:

- Classic `/dashboard`
- Classic `/decks`
- Classic `/deck/qa-deck-id`
- Classic `/generate`
- Classic `/dashboard` at mobile width `390x844`
- Classic `/dashboard` with Warm Linen
- Glassy `/dashboard` sanity check

Observed:

- Classic routes render `.app-shell` and `.app-topnav`.
- Header remains sticky at `top: 0` after scroll-probe content is inserted and the page is scrolled.
- Header background resolves to `rgba(12, 19, 27, 0.55)` for Rainy Day classic routes.
- Warm Linen header background resolves to `rgba(246, 240, 231, 0.7)`.
- Header backdrop remains `blur(28px) saturate(1.35)`.
- No `.glassy-atmosphere` is present on classic routes.
- Glassy `/dashboard` still uses `skin-glassy`, keeps `.glassy-atmosphere`, and resolves nav background from the existing `color-mix(in srgb, var(--app-bg) 85%, transparent)` override with `blur(36px) saturate(1.4)`.

## Remaining Risk

Because the QA session used a fake local session, it verified the live route shells, sticky behavior, computed CSS, and scroll-under-header mechanics, but not real authenticated dashboard/deck data density. A final visual pass in a real logged-in account is still useful for judging whether the blur strength is subjectively ideal across actual cards.

## Tier 2 Status

Tier 2 is not implemented. It is still optional only if the team wants the stronger Matrix-style perceptual treatment after reviewing Tier 1 with real content. Tier 1 addresses the identified literal blur blocker.
