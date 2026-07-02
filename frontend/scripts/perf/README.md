# Resonance Frontend Production Perf Benchmark

This benchmark builds the Vite production app into `scripts/perf/dist`, serves it with a tiny static server plus SPA fallback, and drives installed Chrome through the Chrome DevTools Protocol. It does not require Playwright or Puppeteer.

The runner uses `scripts/perf/vite.perf.config.mjs`, which mirrors the app Vite config, enables manifest/sourcemaps for bundle inspection, writes into `scripts/perf/dist`, and sets `resolve.preserveSymlinks: true` so this Windows sandbox does not trip Vite's `net use` realpath subprocess.

Run from `frontend`:

```bash
node scripts/perf/benchmark.mjs
```

If Supabase admin calls fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or `fetch failed` (a local
HTTPS-inspecting proxy/AV whose root CA lives in the Windows cert store but not in Node's
bundled CA list), run with the system store:

```bash
NODE_OPTIONS=--use-system-ca node scripts/perf/benchmark.mjs
```

Useful options:

```bash
node scripts/perf/benchmark.mjs --runs=5
node scripts/perf/benchmark.mjs --skip-build
node scripts/perf/benchmark.mjs --build-only
node scripts/perf/benchmark.mjs --chrome="C:\Program Files\Google\Chrome\Application\chrome.exe"
node scripts/perf/benchmark.mjs --skip-build --browser-url=http://127.0.0.1:9222 --close-browser
node scripts/perf/benchmark.mjs --unauthenticated
```

Measured routes:

`/`, `/login`, `/dashboard`, `/today`, `/categories`, `/games`, `/decks`, `/generate`, `/study`, `/study/video`, `/study/image`, `/study/flashcard`, `/study/audio`, `/music`, `/speak`.

Metrics:

- Cold load: fresh browser context, cache disabled, full-page navigation to each route.
- Warm transition: fresh browser context, load `/dashboard`, then client-side `history.pushState` plus `popstate` to each route.
- TTFB: `navigation.responseStart - navigation.requestStart` for cold full-page loads.
- FCP: browser `first-contentful-paint` entry for cold full-page loads.
- Largest chunk wait: `responseEnd`, relative to navigation or transition start, for the largest loaded `/assets/*.js` chunk by decoded size.
- Route rendered: MutationObserver on `#root main`, `#root [role=main]`, `#root`, or `body`, settled through double `requestAnimationFrame`.

Auth behavior:

By default, the runner prepares a dedicated Supabase benchmark user through the admin API, signs in with the anon key, and injects the real session into each fresh Chrome context before navigation. It reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`, and `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `.env` / process env. The generated benchmark-user password is stored in the gitignored `scripts/perf/.benchmark-user.json`; do not commit or print it.

Protected routes are not bypassed and product auth logic is not weakened. Each result row reports whether the route rendered as `authenticated`, `redirected`, or a setup/browser failure. Use `--unauthenticated` only when intentionally remeasuring redirect/auth-shell behavior.

Outputs:

- `scripts/perf/results/baseline-<timestamp>.json`
- `scripts/perf/results/baseline-<timestamp>.md`
