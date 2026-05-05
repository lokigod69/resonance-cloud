# Classic Header Glass Tier 1 Tuning Report

## Why 0.55 Was Too Aggressive

The first Tier 1 patch made the existing blur visible, but `0.55` alpha on dark themes left 45% of the scrolling page visible through the header. In real browser testing that made the header read as exposed transparency rather than frosted glass: content behind the nav could compete with the nav controls and feel readable-through.

The revised tuning keeps the header below the original near-solid `0.90` to `0.94` range, but raises it enough that content behind the sticky header is obscured while the existing `blur(28px) saturate(1.35)` can still add depth. It also adds Matrix-Arena-style perceived glass in the existing header only: a horizontal depth gradient, a faint accent sweep, and a slightly stronger bottom border.

## Final Opacity Values

- `:root --nav-bg`: `rgba(12, 19, 27, 0.78)`
- `theme-midnight --nav-bg`: `rgba(8, 11, 12, 0.78)`
- `theme-rainy-day --nav-bg`: `rgba(12, 19, 27, 0.78)`
- `theme-red-wine --nav-bg`: `rgba(18, 7, 13, 0.78)`
- `theme-slate --nav-bg`: `rgba(15, 18, 22, 0.78)`
- `theme-warm-linen --nav-bg`: `rgba(246, 240, 231, 0.86)`

No `backdrop-filter`, layout component, glassy-skin override, or decorative background/grid layer was changed.

## Perceptual Header Treatment

Classic `.app-topnav` now uses a horizontal gradient derived from `var(--nav-bg)`, with a subtle accent mix at the center. A classic-scoped `::before` pseudo-element adds a faint accent sweep inside the header. Direct header children are positioned above that pseudo-element so labels, buttons, and menus remain readable and clickable. The bottom border color is strengthened with `color-mix(in srgb, var(--accent) 24%, var(--border-subtle))`.

The treatment is scoped to `.skin-classic .app-topnav` so glassy routes continue using their existing glassy nav background and blur override.

## Build Result

Command: `cd frontend && npm run build`

Result: passed with exit code 0.

Notes: Vite emitted existing bundle-size and dynamic-import warnings; no build errors.

## QA Result / Pending

Fresh local CSS smoke QA was run against the live Vite app at `http://127.0.0.1:5173`. The smoke check inserted an `.app-topnav` into the loaded app shell CSS to avoid auth/session redirects while still verifying the actual computed theme rules.

Observed:

- Classic Rainy Day resolves `--nav-bg` to `rgba(12, 19, 27, 0.78)`.
- Classic Warm Linen resolves `--nav-bg` to `rgba(246, 240, 231, 0.86)`.
- Classic mobile width `390x844` keeps the Rainy Day value at `rgba(12, 19, 27, 0.78)`.
- Classic header computes `position: sticky`, `isolation: isolate`, and remains at `top: 0` after scroll.
- Classic header background computes to the horizontal `linear-gradient(...)` treatment.
- Classic header keeps `backdrop-filter: blur(28px) saturate(1.35)`.
- Classic `::before` accent sweep computes with `content: ""`, `z-index: 0`, `opacity: 0.45`, `pointer-events: none`, and the accent gradient.
- Classic direct header child computes as `position: relative` and `z-index: 1`.
- Classic header border color resolves through the strengthened accent `color-mix(...)`.
- Glassy `.app-topnav` smoke check does not receive the classic gradient or `::before`; it keeps the existing `color-mix(in srgb, var(--app-bg) 85%, transparent)` nav background and `blur(36px) saturate(1.4)`.

Required real-account visual QA remains pending:

- Classic `/dashboard` with real logged-in data.
- Scroll content behind the header and verify the content is obscured, not legible.
- Verify the header feels less solid than the original `0.90` to `0.94` version, but not exposed.
- Warm Linen readability check.
- Glassy `/dashboard` real-route sanity check.

## Tier 2 Matrix-Style Inner Gradient

The Matrix-style inner gradient and accent sweep are now implemented in the existing classic header. Further Tier 2 work is not needed unless real logged-in QA shows the header still lacks enough premium depth. Any follow-up should remain scoped to the existing header and avoid new decorative background layers.
