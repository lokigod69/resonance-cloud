# Classic Header Glass Tier 1 Tuning Report

## Why 0.55 Was Too Aggressive

The first Tier 1 patch made the existing blur visible, but `0.55` alpha on dark themes left 45% of the scrolling page visible through the header. In real browser testing that made the header read as exposed transparency rather than frosted glass: content behind the nav could compete with the nav controls and feel readable-through.

The tuning keeps the header below the original near-solid `0.90` to `0.94` range, but raises it enough that content behind the sticky header is obscured while the existing `blur(28px) saturate(1.35)` can still add depth.

## Final Opacity Values

- `:root --nav-bg`: `rgba(12, 19, 27, 0.76)`
- `theme-midnight --nav-bg`: `rgba(8, 11, 12, 0.76)`
- `theme-rainy-day --nav-bg`: `rgba(12, 19, 27, 0.76)`
- `theme-red-wine --nav-bg`: `rgba(18, 7, 13, 0.76)`
- `theme-slate --nav-bg`: `rgba(15, 18, 22, 0.76)`
- `theme-warm-linen --nav-bg`: `rgba(246, 240, 231, 0.84)`

No `backdrop-filter`, layout, glassy-skin override, or decorative layer was changed.

## Build Result

Command: `cd frontend && npm run build`

Result: passed with exit code 0.

Notes: Vite emitted existing bundle-size and dynamic-import warnings; no build errors.

## QA Result / Pending

Fresh local smoke QA was run against `http://127.0.0.1:5173` with bundled Playwright and a local fake Supabase session only to reach protected layout routes.

Observed:

- Classic `/dashboard` with Rainy Day resolves `.app-topnav` background to `rgba(12, 19, 27, 0.76)`.
- Classic `/dashboard` with Warm Linen resolves `.app-topnav` background to `rgba(246, 240, 231, 0.84)`.
- Classic mobile width `390x844` keeps the Rainy Day value at `rgba(12, 19, 27, 0.76)`.
- Header remains sticky at `top: 0` after scroll-probe content is inserted and the page is scrolled.
- Header keeps `backdrop-filter: blur(28px) saturate(1.35)`.
- Classic routes do not render `.glassy-atmosphere`.
- Glassy `/dashboard` remains on `skin-glassy`, keeps `.glassy-atmosphere`, and keeps the existing `color-mix(in srgb, var(--app-bg) 85%, transparent)` nav background with `blur(36px) saturate(1.4)`.

Required real-account visual QA remains pending:

- Classic `/dashboard` with real logged-in data.
- Scroll content behind the header and verify the content is obscured, not legible.
- Verify the header feels less solid than the original `0.90` to `0.94` version, but not exposed.
- Warm Linen readability check.
- Glassy `/dashboard` sanity check.

## Tier 2 Matrix-Style Inner Gradient

Tier 2 is still not implemented. It should remain optional until this safer opacity range is judged in a real logged-in browser session. If the tuned alpha still lacks the desired perceived depth, the Matrix-style inner gradient can be evaluated later as a separate scoped change.
